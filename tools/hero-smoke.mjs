// Accepted native hero/cinematic audition; enemies remain explicitly absent.
import {inputs as stage1} from '../tests/routes/stage1.mjs';
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
const profile=await mkdtemp(join(tmpdir(),'kagebot-hero-'));
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
 await cdp('Page.navigate',{url:base+'/tests/hero.html'});await waitFor('!!window.heroLab');


 await click('#sound');await waitFor("heroLab.state().context==='running'");
 await evaluate('window.skipDone=false;heroLab.play([{confirmPressed:true},...Array.from({length:120},()=>({}))]).then(()=>window.skipDone=true);true');
 await waitFor("heroLab.state().scene==='home-intro'");await click('canvas');await waitFor('window.skipDone');
 assert.equal(await evaluate('heroLab.state().scene'),'map');trace.push({name:'real-pointer-opening-skip',state:await evaluate('heroLab.state()')});await evaluate('heroLab.reset()');
 await evaluate('heroLab.record()');
 await evaluate('heroLab.run([{confirmPressed:true}])');
 for(const [name,steps] of [['meditate',180],['help',90],['startle',80],['run',100],['grab',52],['departure',40],['map',170]]){
  const state=await evaluate(`heroLab.play(Array.from({length:${steps}},()=>({})))`);trace.push({name,state});await screenshot(`${name}.png`);
 }
 const video=await evaluate('heroLab.endRecord()');await writeFile(join(output,'opening.webm'),Buffer.from(video,'base64'),{mode:0o600});
 assert.equal(await evaluate('heroLab.state().scene'),'map');
 await evaluate('heroLab.run([{confirmPressed:true}])');
 const replay=await evaluate(`heroLab.inspect(${JSON.stringify(stage1)})`);
 for(const capture of replay.captures){await writeFile(join(output,`stage1-${capture.label}.png`),Buffer.from(capture.png,'base64'),{mode:0o600});delete capture.png;}
 assert.equal(replay.end.scene,'map');assert.equal(replay.end.p.hp,4);
 for(const pose of ['run-low','frontflip','wall-climb','wall-jump','dash','sword-1','sword-2','sword-3','laser','finisher'])assert(replay.frames[pose],`missing controller pose ${pose}`);
 trace.push({name:'authored-stage1',replay});
 // Native motion, not an offline pose carousel: actual route at normal fixed-step pace.
 await evaluate('heroLab.reset();heroLab.run([{confirmPressed:true},{confirmPressed:true},{confirmPressed:true}])');
 await evaluate('heroLab.record()');await evaluate(`heroLab.play(${JSON.stringify(stage1.slice(0,1340))})`);
 const motion=await evaluate('heroLab.endRecord()');await writeFile(join(output,'controller-motion.webm'),Buffer.from(motion,'base64'),{mode:0o600});
 // Fresh run, normal opening skip and map confirm. Walk into the real first foe.
 await evaluate('heroLab.reset();heroLab.run([{confirmPressed:true},{confirmPressed:true},{confirmPressed:true}])');
 const hurt=await evaluate(`(()=>{const inputs=[];for(let n=0;n<900&&heroLab.state().p.hp===4;n++){const i={right:heroLab.state().p.x<565};inputs.push(i);heroLab.tick(i);}heroLab.tick({});inputs.push({});return {inputs,state:heroLab.state()};})()`);
 assert(hurt.state.p.hp<4);assert.equal(hurt.state.p.pose,'hurt');await screenshot('actual-hurt.png');
 const hurtFrames=await evaluate('heroLab.inspect(Array.from({length:20},()=>({})))');
 assert.equal(hurtFrames.frames.hurt.length,4);for(const c of hurtFrames.captures)delete c.png;
 trace.push({name:'actual-hurt',...hurt,frames:hurtFrames.frames});
 // Replay to real first wall, then explicitly hold, fire and slash using inputs.
 await evaluate('heroLab.reset();heroLab.run([{confirmPressed:true},{confirmPressed:true},{confirmPressed:true}])');
 const wall=await evaluate(`(()=>{for(const i of ${JSON.stringify(stage1)}){heroLab.tick(i);if(heroLab.state().p.wall)return heroLab.state();}throw Error('no wall');})()`);
 assert(wall.p.wall);await evaluate('heroLab.run(Array.from({length:30},()=>({right:true})))');await screenshot('wall-hold.png');
 await evaluate('heroLab.record()');
 const wallLaser=await evaluate('heroLab.play([{right:true,laserPressed:true},...Array.from({length:8},()=>({right:true}))])');await screenshot('wall-laser.png');
 const wallSword=await evaluate('heroLab.play([{right:true,attackPressed:true},...Array.from({length:8},()=>({right:true}))])');await screenshot('wall-sword.png');
 await evaluate('heroLab.play(Array.from({length:100},(_,n)=>({right:true,climb:true,attackPressed:n%18===0})))');
 const wallVideo=await evaluate('heroLab.endRecord()');await writeFile(join(output,'wall-actions.webm'),Buffer.from(wallVideo,'base64'),{mode:0o600});trace.push({name:'wall-actions',wall,wallLaser,wallSword});
 // Production scene pause/mute audio lifecycle in the actual opening.
 await evaluate('heroLab.reset();heroLab.run([{confirmPressed:true},{pausePressed:true}])');await waitFor("heroLab.state().context==='suspended'");
 const paused=await evaluate('heroLab.run(Array.from({length:30},()=>({})))');assert(paused.paused);assert.equal(paused.time,0);
 await evaluate('heroLab.run([{confirmPressed:true}])');await waitFor("heroLab.state().context==='running'");
 await evaluate('heroLab.audio.musicMuted=true;heroLab.audio.sfxMuted=true;heroLab.tick({})');await waitFor("heroLab.state().context==='suspended'");
 await evaluate('heroLab.audio.musicMuted=false;heroLab.audio.sfxMuted=false;heroLab.tick({})');await waitFor("heroLab.state().context==='running'");
 await evaluate('heroLab.stop()');
 // This isolated layer is not shipping proof; complete inventory must still load.
 await cdp('Page.navigate',{url:base+'/index.html'});await waitFor("document.querySelector('#status')?.textContent.includes('WORLD 1 · READY')");await screenshot('shipping-inventory-loaded.png');
 const shippingStatus=await evaluate("document.querySelector('#status').textContent");assert(shippingStatus.includes('READY'));
 assert.deepEqual(exceptions,[]);assert.deepEqual(networkMisses,[]);
 await writeFile(join(output,'evidence.json'),JSON.stringify({passed:true,trace,shippingStatus,exceptions,networkMisses},null,2),{mode:0o600});
 console.log('PASS real hero/cinematic/audio audition; enemies explicitly absent, not final game');
}catch(error){await writeFile(join(output,'evidence.json'),JSON.stringify({passed:false,error:error.message,trace,exceptions,networkMisses},null,2),{mode:0o600});throw error;}
finally{ws?.close();chrome.kill('SIGTERM');await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});await writeFile(join(output,'cleanup.json'),JSON.stringify({pid:chrome.pid,exitCode:chrome.exitCode,serverClosed:!server.listening,removedProfile:profile}),{mode:0o600});}
