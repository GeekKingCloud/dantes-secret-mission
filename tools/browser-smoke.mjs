// Dependency-free Chromium/CDP smoke check. All servers/profile are disposable.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),profile=await mkdtemp(join(tmpdir(),'kagebot-browser-'));
const output=process.argv[2]?resolve(process.argv[2]):await mkdtemp(join(tmpdir(),'kagebot-evidence-'));
await mkdir(output,{recursive:true,mode:0o700});
const mime={'.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{try{
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+sep)||path.split(sep).some(part=>part.startsWith('.')))throw Error('refused');
 const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const chrome=spawn(process.env.CHROMIUM||'chromium',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws;const trace=[],exceptions=[];
try{
 let port;
 for(let n=0;n<100;n++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(50);}}
 assert(port,'Chromium readiness');
 const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let next=0;const pending=new Map();
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const task=pending.get(m.id);pending.delete(m.id);m.error?task.reject(Error(m.error.message)):task.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.text);};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;};
 const waitFor=async expression=>{for(let n=0;n<100;n++){if(await evaluate(expression))return;await delay(30);}throw Error(`Browser wait failed: ${expression}`);};
 const navigate=async path=>{await cdp('Page.navigate',{url:base+path});await waitFor('document.readyState==="complete"');};
 const key=(code,down)=>cdp('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',code,key:code==='Space'?' ':code.replace('Key',''),windowsVirtualKeyCode:code==='Space'?32:code.charCodeAt(3)});
 const tap=async code=>{await key(code,true);await key(code,false);};
 const screenshot=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(output,name),Buffer.from(r.data,'base64'),{mode:0o600});};
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1100,height:860,deviceScaleFactor:1,mobile:false});
 await navigate('/tests/controller.html?manual=1');await waitFor('!!window.lab');
 await key('Space',true);await evaluate('lab.frame(1/240)');assert.equal((await evaluate('lab.snapshot()')).ticks,0);assert((await evaluate('lab.pending()')).includes('jump'));
 await evaluate('lab.frame(1/240)');let state=await evaluate('lab.snapshot()');assert(state.y<300);assert.equal(state.ticks,1);await key('Space',false);
 await evaluate('lab.advance(8)');await tap('Space');await evaluate('lab.advance()');state=await evaluate('lab.snapshot()');assert.equal(state.pose,'frontflip');trace.push({check:'240Hz queued keyboard + doubleflip',state});
 await tap('KeyK');await evaluate('lab.advance()');assert.equal((await evaluate('lab.snapshot()')).dash,0);
 await navigate('/tests/controller.html?scenario=combat&manual=1');await waitFor('!!window.lab');
 const actions=new Map([[0,'KeyL'],[1,'KeyD'],[2,'KeyJ'],[22,'KeyJ'],[52,'KeyJ'],[105,'KeyK'],[130,'KeyA'],[131,'KeyF']]);
 for(let frame=0;frame<165;frame++){
  const code=actions.get(frame);if(code)await key(code,true);
  // Same real keyboard sequence at 240Hz render cadence / 120Hz simulation.
  // The edge must survive the first render frame, which has no physics step.
  state=await evaluate('lab.frame(1/240);lab.snapshot()');assert.equal(state.ticks,frame);
  if(code==='KeyJ')assert((await evaluate('lab.pending()')).includes('attack'));
  state=await evaluate('lab.frame(1/240);lab.snapshot()');assert.equal(state.ticks,frame+1);
  if(code)await key(code,false);
  if([22,52].includes(frame))assert(state.attackQueue>0,'early sword press queues the next strike');
  if(frame===105){assert.equal(state.attackTime,0);assert(state.dash>0,'recovery cancels immediately to dash');}
  if([0,22,52,60,104,105,116,130,145].includes(frame)){trace.push({frame,state});await screenshot(`combat-${frame}.png`);}
 }
 state=await evaluate('lab.snapshot()');assert(!state.enemies[0].alive);assert.equal(state.ammo,4);assert.equal(state.hp,4);assert(state.poses.includes('sword-3'));assert(state.poses.includes('finisher'));
 trace.push({check:'240Hz CDP keyboard input-only buffered combo/recovery cancel/dash/rear execute/refund',state});
 await navigate('/tests/controller.html?manual=1');await waitFor('!!window.lab');
 // Actual touch events reach the same pointer-capture button handlers.
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await evaluate(`window.touchProof=[];for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>touchProof.push({type,pointerType:e.pointerType,target:e.target.dataset.key||e.target.tagName}),true)`);
 // CDP touch coordinates are viewport-relative, not document-relative. The
 // diagnostic readout makes this button start below the fold.
 await evaluate('document.querySelector("[data-key=jump]").scrollIntoView({block:"center",behavior:"instant"})');
 const pos=await evaluate('(()=>{const r=document.querySelector("[data-key=jump]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
 trace.push({check:'touch hit-test geometry',pos,viewport:await evaluate('({w:innerWidth,h:innerHeight})'),target:await evaluate(`document.elementFromPoint(${pos.x},${pos.y})?.dataset.key||null`)});
 assert.equal(trace.at(-1).target,'jump','touch coordinate must hit the visible JUMP button');
 await screenshot('touch-before.png');
 await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pos,id:1}]});await evaluate('lab.advance()');
 await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});state=await evaluate('lab.snapshot()');trace.push({check:'touch jump',state,events:await evaluate('touchProof')});assert(state.y<300);
 assert(trace.at(-1).events.some(e=>e.type==='pointerdown'&&e.pointerType==='touch'&&e.target==='jump'));
 assert(trace.at(-1).events.some(e=>e.type==='pointerup'&&e.pointerType==='touch'&&e.target==='jump'));
 await evaluate('scrollTo(0,0)');await screenshot('touch-jump.png');
 await navigate('/index.html');await waitFor('document.querySelector("#status")?.textContent.includes("DEVELOPMENT ERROR")');
 const error=await evaluate('document.querySelector("#message").textContent');assert.match(error,/Missing characters manifest/);trace.push({check:'shipping entry rejects absent PNG manifest',error});await screenshot('missing-assets.png');
 assert.deepEqual(exceptions,[]);await writeFile(join(output,'browser-evidence.json'),JSON.stringify({passed:true,trace,exceptions},null,2),{mode:0o600});
 console.log(`PASS: keyboard, 240Hz queue, doubleflip, no air dash, input-only combo/dash/finisher/refund, touch, explicit missing-assets error. Evidence: ${output}`);
}catch(error){
 await writeFile(join(output,'browser-evidence.json'),JSON.stringify({passed:false,error:error.message,trace,exceptions},null,2),{mode:0o600});
 throw error;
}finally{
 ws?.close();chrome.kill('SIGTERM');await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));
 await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});
 await writeFile(join(output,'cleanup.json'),JSON.stringify({chromiumPid:chrome.pid,exitCode:chrome.exitCode,signal:chrome.signalCode,serverClosed:!server.listening,profileRemoved:profile},null,2),{mode:0o600});
}
