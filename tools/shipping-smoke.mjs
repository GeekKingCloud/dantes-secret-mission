// Real shipping entry: exact assembled actors, campaign and focused visual proof.
import {routes,shots,proof,recoveryInputs} from '../tests/routes/campaign.mjs';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(process.argv[2]);
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
await mkdir(output,{recursive:true,mode:0o700});
const profile=await mkdtemp(join(tmpdir(),'kagebot-shipping-'));
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
 await cdp('Page.navigate',{url:base+'/index.html'});await waitFor("document.querySelector('#status')?.textContent.includes('WORLD 1 · READY')");await evaluate("import('/tests/shipping-probe.mjs').then(m=>{window.probe=m;return true})");


 const tap=async code=>{for(const type of ['keyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,code,key:code==='Enter'?'Enter':code,windowsVirtualKeyCode:code==='Enter'?13:27});};
 await screenshot('title.png');await tap('Enter');await waitFor("probe.state().scene==='home-intro'");
 await tap('Escape');await waitFor('probe.state().paused');await screenshot('keyboard-paused.png');await tap('Enter');await waitFor('!probe.state().paused');
 await evaluate('probe.game.setReplayMode(true)');await screenshot('home.png');
 await evaluate('probe.record()');await evaluate('probe.run(Array.from({length:700},()=>({})),{paced:true})');
 await writeFile(join(output,'opening.webm'),Buffer.from(await evaluate('probe.endRecord()'),'base64'),{mode:0o600});
 assert.equal(await evaluate('probe.state().scene'),'map');await screenshot('initial-map.png');
 const allCaptures=[];
 for(const [id,inputs] of Object.entries(routes)){
  await evaluate('probe.run([{confirmPressed:true}])');assert.equal(await evaluate('probe.state().level'),id);await screenshot(`${id}-spawn.png`);
  if(id==='stage2'){const reset=await evaluate(`probe.run(${JSON.stringify(recoveryInputs)})`);assert.equal(reset.retries,1);assert.deepEqual(reset.completed,['stage1']);}
  if(id==='stage1'){
   await evaluate('probe.record()');await evaluate(`probe.run(${JSON.stringify(inputs)},{paced:true})`);
   const clip=await evaluate('probe.endRecord()');await writeFile(join(output,'stage1-combat.webm'),Buffer.from(clip,'base64'),{mode:0o600});
   trace.push({check:'normal-speed combat segment',proof:await evaluate('probe.proof()')});
  }else if(id==='stage3'){
   await evaluate(`probe.run(${JSON.stringify(inputs.slice(0,8400))})`);await evaluate('probe.record()');
   await evaluate(`probe.run(${JSON.stringify(inputs.slice(8400))},{paced:true})`);
   await writeFile(join(output,'boss-patterns.webm'),Buffer.from(await evaluate('probe.endRecord()'),'base64'),{mode:0o600});
  }else await evaluate(`probe.run(${JSON.stringify(inputs)})`);
  const result=await evaluate('probe.proof()');assert.equal(result.state.scene,'map');assert.equal(result.state.p.hp,4);assert(result.state.completed.includes(id));trace.push({id,result});
  const captures=await evaluate('probe.drain()');for(const c of captures){await writeFile(join(output,`${c.label}.png`),Buffer.from(c.png,'base64'),{mode:0o600});delete c.png;allCaptures.push(c);}
  await screenshot(`${id}-complete-map.png`);
 }
 const end=await evaluate('probe.run([{confirmPressed:true}])');assert.equal(end.scene,'world2');await screenshot('world2.png');
 assert(allCaptures.some(c=>c.label.endsWith('rear-cue')));assert(allCaptures.some(c=>c.label.endsWith('execution')));assert(allCaptures.some(c=>c.label.endsWith('dash-through')));
 const focused=[];
 for(const type of ['zombie','bear','ghost','spider','masked-mutant-boss']){
  await evaluate('probe.record({audio:false})');
  focused.push(...await evaluate(`import('/tests/enemy-qa.mjs').then(m=>m.inspect(probe.game,{paced:true,only:${JSON.stringify(type)}}))`));
  await writeFile(join(output,`focused-qa-${type}.webm`),Buffer.from(await evaluate('probe.endRecord()'),'base64'),{mode:0o600});
 }
 const missingDraws=await evaluate(`(()=>{const drawn=new Set(probe.proof().drawn);return [...probe.game.assets.groups.get('characters')].flatMap(([id,a])=>Object.keys(a.animations).map(pose=>'characters/'+id+'/'+pose)).filter(key=>!drawn.has(key))})()`);assert.deepEqual(missingDraws,[],'every required actor action actually drawn');
 for(const c of focused){await writeFile(join(output,`${c.label}.png`),Buffer.from(c.png,'base64'),{mode:0o600});delete c.png;}
 for(const type of ['zombie','bear','ghost','spider','masked-mutant-boss'])assert([...allCaptures,...focused].some(c=>c.label.includes(type)&&c.label.includes('active')),`${type} active pixels`);
 assert(focused.some(c=>c.label==='focused-qa-wall-held-sword'));assert(focused.some(c=>c.label==='focused-qa-wall-held-laser'));
 // Standard-pad transport through navigator -> shipping Pad -> BrowserInput.
 await evaluate("window.padButtons=Array.from({length:16},()=>({pressed:false,value:0}));navigator.getGamepads=()=>[{mapping:'standard',connected:true,axes:[0,0],buttons:padButtons}];probe.game.setReplayMode(false)");await delay(100);
 const pad=async n=>{await evaluate(`padButtons[${n}]={pressed:true,value:1}`);await delay(65);await evaluate(`padButtons[${n}]={pressed:false,value:0}`);await delay(65);};
 await pad(0);assert.equal(await evaluate('probe.state().scene'),'map');for(let n=0;n<3;n++)await pad(14);assert.equal(await evaluate('probe.state().selection'),1);
 await pad(0);await waitFor("probe.state().scene==='stage'");await pad(9);assert(await evaluate('probe.state().paused'));await pad(0);assert(!await evaluate('probe.state().paused'));trace.push({check:'simulated standard pad World2/map/replay/pause/resume',state:await evaluate('probe.state()')});
 await tap('Escape');await waitFor('probe.state().paused');
 await cdp('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const touch=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);assert(p.x>0&&p.x<844&&p.y>0&&p.y<390);await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await delay(65);await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(65);};
 await touch('#start');await waitFor('!probe.state().paused');await touch('[data-key=jump]');assert((await evaluate('probe.state().p.y'))<300);await screenshot('shipping-touch-landscape.png');
 const layout=await evaluate(`(()=>{const c=document.querySelector('canvas').getBoundingClientRect();return {scrollY,canvas:{x:c.x,y:c.y,w:c.width,h:c.height},viewport:{w:innerWidth,h:innerHeight}}})()`);assert.equal(layout.scrollY,0);assert(layout.canvas.y>=0&&layout.canvas.y+layout.canvas.h<=390);trace.push({check:'real touch resume/jump with viewport visible, no scroll',layout,state:await evaluate('probe.state()')});
 assert.deepEqual(exceptions,[]);assert.deepEqual(networkMisses,[]);
 await cdp('Emulation.setDeviceMetricsOverride',{width:430,height:860,deviceScaleFactor:1,mobile:true});await delay(100);await screenshot('shipping-touch-portrait.png');
 const portrait=await evaluate(`(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),b=document.querySelector('[data-key=finish]').getBoundingClientRect();return {scrollY,canvasBottom:c.bottom,controlsBottom:b.bottom,height:innerHeight}})()`);assert.equal(portrait.scrollY,0);assert(portrait.canvasBottom<=portrait.height&&portrait.controlsBottom<=portrait.height);trace.push({check:'portrait viewport/control coexistence',portrait});
 await writeFile(join(output,'evidence.json'),JSON.stringify({passed:true,revision,hero:'revised native model; local candidate, not publication approval',proof,trace,captures:allCaptures,focused,end,drawn:await evaluate('probe.proof().drawn'),exceptions,networkMisses},null,2),{mode:0o600});
 console.log('PASS full-actor shipping campaign/input controls; NOT publication approval');
 await evaluate('probe.game.audio.stop()');
}catch(error){await writeFile(join(output,'evidence.json'),JSON.stringify({passed:false,error:error.message,trace,exceptions,networkMisses},null,2),{mode:0o600});throw error;}
finally{ws?.close();chrome.kill('SIGTERM');await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});await writeFile(join(output,'cleanup.json'),JSON.stringify({pid:chrome.pid,exitCode:chrome.exitCode,serverClosed:!server.listening,removedProfile:profile}),{mode:0o600});}
