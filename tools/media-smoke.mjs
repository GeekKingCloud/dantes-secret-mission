// Real Chromium PNG/Web Audio integration proof; no actor stubs or campaign data.
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
const profile=await mkdtemp(join(tmpdir(),'kagebot-media-'));
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
 await cdp('Page.navigate',{url:base+'/tests/media.html'});await waitFor('!!window.media');
 assert.equal(await evaluate('[...media.assets.groups.values()].reduce((n,g)=>n+g.size,0)'),44);
 for(const scene of ['title','home','map','map-complete','rooftop','arena','world2']){
  const calls=await evaluate(`media.render(${JSON.stringify(scene)},2.2)`);trace.push({scene,drawIDs:[...new Set(calls.map(c=>`${c.group}/${c.id}`))]});await screenshot(`${scene}.png`);
 }
 const layers=await evaluate("media.render('rooftop',0).filter(c=>['sky','moon','far-mountains','distant-temples','far-clouds','near-clouds'].includes(c.id))");
 const shifted=await evaluate("media.render('rooftop',2,{x:130,y:-180}).filter(c=>['sky','moon','far-mountains','distant-temples','far-clouds','near-clouds'].includes(c.id))");
 assert.equal(new Set(layers.map(x=>x.id)).size,6);assert.notDeepEqual(layers,shifted);
 const near=shifted.find(l=>l.id==='near-clouds'),far=shifted.find(l=>l.id==='far-clouds');assert.equal(near.alpha,.22);assert.notEqual(near.x,far.x);
 trace.push({check:'six independent PNG layers, camera X/Y and unequal cloud drift',before:layers,after:shifted});await screenshot('rooftop-camera.png');
 const f1=await evaluate("media.render('arena',0);document.querySelector('canvas').toDataURL()"),f2=await evaluate("media.render('arena',.25);document.querySelector('canvas').toDataURL()");assert.notEqual(f1,f2,'actual portal frames change');
 // Inspect real shipping layout before any touch scroll workaround.
 for(const [name,width,height] of [['portrait',390,844],['landscape',844,390]]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await evaluate("media.render('rooftop',2.2);scrollTo(0,0)");await screenshot(`mobile-${name}.png`);
  const layout=await evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};return {viewport:{w:innerWidth,h:innerHeight},canvas:rect(document.querySelector('canvas')),buttons:[...document.querySelectorAll('[data-key]')].map(e=>({key:e.dataset.key,...rect(e)}))}})()`);
  trace.push({check:`mobile ${name} no-scroll viewport + touch buttons`,layout});
  assert(layout.canvas.y>=0&&layout.canvas.bottom<=height,`${name} entire game viewport visible`);
  for(const b of layout.buttons)assert(b.y>=0&&b.bottom<=height&&b.x>=0&&b.right<=width&&b.h>=38,`${name} ${b.key} visible and usable`);
  const b=layout.buttons.find(b=>b.key==='attack');await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.w/2,y:b.y+b.h/2,id:1}]});
  assert((await evaluate('media.input()')).held.includes('attack'));await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(!(await evaluate('media.input()')).held.includes('attack'));
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:1100,height:850,deviceScaleFactor:1,mobile:false});await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
 // Observe native BufferSource nodes; no mock AudioContext or synthesized PCM.
 await evaluate(`window.audioProbe={active:new Set(),max:0,played:[]};const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const s=create.call(this),connect=s.connect.bind(s),start=s.start.bind(s),stop=s.stop.bind(s);let music=false;s.connect=(to,...a)=>{music=to===media.audio.musicBus;return connect(to,...a)};s.start=(...a)=>{if(music){audioProbe.active.add(s);audioProbe.max=Math.max(audioProbe.max,audioProbe.active.size)}audioProbe.played.push([...media.audio.buffers].find(([,e])=>e.buffer===s.buffer)?.[0]);return start(...a)};s.stop=(...a)=>{audioProbe.active.delete(s);return stop(...a)};s.addEventListener('ended',()=>audioProbe.active.delete(s));return s;}`);
 assert.equal(await evaluate('media.audio.ctx'),null);
 await click('#sound');await waitFor('media.state().context==="running"&&media.state().musicSources===1');assert(!await evaluate('window.mediaError'));
 await evaluate('media.decodeAll()');assert.equal((await evaluate('media.state()')).decoded,29);
 await evaluate(`window.captureChunks=[];const dest=media.audio.ctx.createMediaStreamDestination();media.audio.limiter.connect(dest);window.recorder=new MediaRecorder(dest.stream);recorder.ondataavailable=e=>captureChunks.push(e.data);recorder.start();`);
 for(const track of ['home','overworld','stage1-approved','stage2','stage3','boss']){
  await evaluate(`media.track(${JSON.stringify(track)})`);await waitFor(`media.state().music===${JSON.stringify(track)}&&!!media.audio.music`);
  const s=await evaluate('({...media.state(),loop:media.audio.music.loop,start:media.audio.music.loopStart,end:media.audio.music.loopEnd,duration:media.audio.music.buffer.duration})');assert(s.loop);assert(Math.abs(s.end-s.duration)<.0001);trace.push({check:`PCM music ${track}`,state:s});
  await delay(160);
 }
 const before=await evaluate('media.state()');for(let n=0;n<12;n++)await evaluate('media.sync()');assert.equal((await evaluate('media.state()')).starts,before.starts);
 await click('#sound');assert.equal((await evaluate('media.state()')).musicGain,0);await click('#sound');assert((await evaluate('media.state()')).musicGain>0);
 await click('#sfx');assert.equal((await evaluate('media.state()')).sfxGain,0);await click('#sfx');
 await click('#sound');await click('#sfx');await waitFor('media.state().context==="suspended"');
 await click('#sound');await waitFor('media.state().context==="running"');await click('#sfx');
 await click('#pause');await waitFor('media.state().context==="suspended"');const paused=await evaluate('media.state()');await delay(150);assert.equal((await evaluate('media.state()')).clock,paused.clock);await click('#pause');await waitFor('media.state().context==="running"');assert.equal((await evaluate('media.state()')).starts,paused.starts);
 const hiddenTab=await cdp('Target.createTarget',{url:'about:blank'});await cdp('Target.activateTarget',{targetId:hiddenTab.targetId});
 await waitFor('document.hidden&&media.state().context==="suspended"');trace.push({check:'actual hidden tab suspends',state:await evaluate('media.state()')});
 await cdp('Target.closeTarget',{targetId:hiddenTab.targetId});await cdp('Page.bringToFront');await waitFor('!document.hidden');await click('#pause');await waitFor('media.state().context==="running"');
 for(const event of ['help','jetpack',...await evaluate('Object.keys(media.audio.manifest.sfx).filter(id=>id!=="victory")'),'checkpoint'])await evaluate(`media.cue(${JSON.stringify(event)})`);
 assert((await evaluate('media.state()')).voices<=8);
 await evaluate("media.cue('victory');media.scene('map')");await waitFor('media.state().music==="victory"&&!!media.audio.music');assert(!await evaluate('media.audio.music.loop'));
 await waitFor('media.state().music==="overworld"&&!!media.audio.music');
 await evaluate("media.scene('world2')");await waitFor('media.state().music==="world2"&&!!media.audio.music');await waitFor('!media.audio.music');const ended=await evaluate('media.state()');
 for(let n=0;n<5;n++)await evaluate('media.sync()');assert.equal((await evaluate('media.state()')).starts,ended.starts,'one-shot never restarts per frame');
 const capture=await evaluate(`new Promise(resolve=>{recorder.onstop=async()=>{const b=new Uint8Array(await new Blob(captureChunks).arrayBuffer());let text='';for(let i=0;i<b.length;i++)text+=String.fromCharCode(b[i]);resolve(btoa(text));};recorder.stop();})`);
 await writeFile(join(output,'audio-lifecycle.webm'),Buffer.from(capture,'base64'),{mode:0o600});
 const proof=await evaluate('({maxMusic:audioProbe.max,played:[...new Set(audioProbe.played)],state:media.state()})');assert.equal(proof.maxMusic,1);assert.equal(proof.played.length,29);assert(!proof.state.error);trace.push({check:'native audio lifecycle + all 29 delivered PCM sources',...proof});
 await evaluate('media.stop()');assert.deepEqual(exceptions,[]);assert.deepEqual(networkMisses,[]);
 await writeFile(join(output,'evidence.json'),JSON.stringify({passed:true,trace,exceptions,networkMisses},null,2),{mode:0o600});console.log(`PASS: 44 real PNGs, scene composites, parallax, no-scroll mobile touch, 29 real PCM decodes/sources, gesture, loop/one-shot, transitions, mute/pause/visibility, no duplicate music. ${output}`);
}catch(error){await writeFile(join(output,'evidence.json'),JSON.stringify({passed:false,error:error.message,trace,exceptions,networkMisses},null,2),{mode:0o600});throw error;}
finally{ws?.close();chrome.kill('SIGTERM');await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});await writeFile(join(output,'cleanup.json'),JSON.stringify({pid:chrome.pid,exitCode:chrome.exitCode,serverClosed:!server.listening,removedProfile:profile}),{mode:0o600});}
