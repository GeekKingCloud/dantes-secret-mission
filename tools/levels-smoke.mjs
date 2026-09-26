// Actual authored levels, input-only campaign and actor-free PNG inspection.
import {routes,shots,proof,recoveryInputs} from '../tests/routes/campaign.mjs';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(process.argv[2]);
await mkdir(output,{recursive:true,mode:0o700});
const profile=await mkdtemp(join(tmpdir(),'kagebot-levels-'));
const mime={'.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.ttf':'font/ttf','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{
 if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+sep)||path.split(sep).some(part=>part.startsWith('.')))throw Error('refused');
 res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(await readFile(path));
}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const chrome=spawn(process.env.CHROMIUM||'chromium',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--no-default-browser-check','--autoplay-policy=user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws;const trace=[],exceptions=[],networkMisses=[];
try {
 let port;for(let n=0;n<100;n++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await delay(50);}}
 assert(port);const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json(),tab=tabs.find(t=>t.type==='page');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let next=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
 else if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);
 else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)networkMisses.push(m.params.response.url);
 else if(m.method==='Network.loadingFailed')networkMisses.push(m.params.errorText);};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const waitFor=async expression=>{for(let n=0;n<250;n++){if(await evaluate(expression))return;await delay(40);}throw Error(`Wait failed: ${expression}`);};
 const screenshot=async name=>{const r=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(output,name),Buffer.from(r.data,'base64'),{mode:0o600});};
 const click=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});};
 await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1100,height:850,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:base+'/tests/levels.html'});await waitFor('!!window.levelLab');

 await evaluate('levelLab.run([{confirmPressed:true}])');await screenshot('home-intro.png');
 await evaluate('levelLab.run(Array.from({length:700},()=>({})))');assert.equal(await evaluate('levelLab.state().scene'),'map');await screenshot('map-initial.png');
 for(const [id,inputs] of Object.entries(routes)) {
  await evaluate('levelLab.run([{confirmPressed:true}])');assert.equal(await evaluate('levelLab.state().level'),id);
  if(id==='stage2'){
   const recovery=await evaluate(`levelLab.run(${JSON.stringify(recoveryInputs)})`);
   assert.equal(recovery.retries,1);assert.deepEqual(recovery.completed,['stage1']);trace.push({check:'stage2 lethal retry preserves completed stage1',state:recovery});
  }
  let index=0;
  for(const shot of shots.filter(s=>s.id===id).sort((a,b)=>a.index-b.index)){
   const state=await evaluate(`levelLab.run(${JSON.stringify(inputs.slice(index,shot.index))})`);index=shot.index;
   assert.equal(state.hp,4);assert.equal(state.retries,id==='stage2'?1:0);assert(!state.calls.some(c=>c.group==='characters'));
   trace.push({...shot,state});await screenshot(`${id}-${shot.name}.png`);
  }
  const state=await evaluate(`levelLab.run(${JSON.stringify(inputs.slice(index))})`);
  assert.equal(state.scene,'map');assert(state.completed.includes(id));await screenshot(`${id}-complete-map.png`);
 }
 const end=await evaluate('levelLab.run([{confirmPressed:true}])');assert.equal(end.scene,'world2');await screenshot('world2.png');
 assert.deepEqual(exceptions,[]);assert.deepEqual(networkMisses,[]);
 await writeFile(join(output,'evidence.json'),JSON.stringify({passed:true,proof,trace,end,exceptions,networkMisses},null,2),{mode:0o600});
 console.log('PASS actual authored campaign inputs -> World2; PNG scenery only, NO final actors');
}catch(error){await writeFile(join(output,'evidence.json'),JSON.stringify({passed:false,error:error.message,trace,exceptions,networkMisses},null,2),{mode:0o600});throw error;}
finally{ws?.close();chrome.kill('SIGTERM');await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});await writeFile(join(output,'cleanup.json'),JSON.stringify({pid:chrome.pid,exitCode:chrome.exitCode,serverClosed:!server.listening,removedProfile:profile}),{mode:0o600});}
