// Isolated accepted-hero audition. Production simulation/render/audio; enemies
// remain real in simulation but deliberately NOT depicted or substituted here.
import {AssetLibrary} from '../asset-loader.mjs';
import {Renderer} from '../renderer.mjs';
import {SceneDirector,introBlocking} from '../scenes.mjs';
import {loadLevel} from '../level-schema.mjs';
import {BrowserInput,runSteps} from '../input.mjs';
import {AudioEngine,bindAudioVisibility} from '../audio.mjs';
import {STEP,COMBO} from '../simulation.mjs';
const html=await(await fetch('../index.html')).text();document.body.append(new DOMParser().parseFromString(html,'text/html').querySelector('main'));
const canvas=document.querySelector('canvas'),assets=new AssetLibrary(),audio=new AudioEngine(),input=new BrowserInput();
for(const group of ['characters','world','ui'])await assets.loadGroup(group,`../assets/${group}/manifest.json`);
const renderer=new Renderer(canvas,assets);let d=new SceneDirector(),calls=[],pendingAudio=[],events=[],loaded=new Map(),queue=null;
for(const id of ['stage1','stage2','stage3'])loaded.set(id,await loadLevel(`../levels/${id}.json`));
const visibility=bindAudioVisibility(audio,()=>{d.paused=true;input.clear();});
const draw=assets.draw.bind(assets);
assets.draw=(ctx,group,id,pose,x,y,options)=>{
 if(group==='characters'){
  const a=assets.get(group,id,pose),anim=a.animations[pose],slot=Math.max(0,Math.floor(options.time*anim.fps));
  const frame=anim.frames[anim.loop?slot%anim.frames.length:Math.min(slot,anim.frames.length-1)];
  calls.push({id,pose,x,y,face:options.face,time:options.time,frame,bounds:a.frameMetadata[frame].bounds,anchor:anim.anchor||a.anchor});
 }
 draw(ctx,group,id,pose,x,y,options);
};
document.querySelector('.brand b').textContent='HERO INTEGRATION LAB';
document.querySelector('.brand small').textContent='PARTIAL: ENEMY ART NOT ACCEPTED · NOT FINAL GAME';
document.querySelector('#overlay').classList.add('hidden');
document.querySelector('#status').textContent='TEST ONLY — SIMULATED FOES ARE NOT DRAWN — NO ACTOR SUBSTITUTES';
function sync(){audio.sync(visibility.visible&&!d.paused,d.music);}
function render(){
 calls=[];
 if(['stage','boss'].includes(d.state)){
  const c=renderer.ctx;c.clearRect(0,0,640,360);renderer.stageScenery(d.game,d.camera);
  c.save();c.translate(-Math.round(d.camera.x),-Math.round(d.camera.y));renderer.player(d.game);c.restore();renderer.hud(d.game);
 }else renderer.draw(d);
 renderer.ctx.fillStyle='#08101fee';renderer.ctx.fillRect(0,344,640,16);renderer.text('HERO AUDITION — ENEMIES NOT RENDERED — NOT FINAL GAME',8,356,10);
}
function tick(i={}){
 d.update(i,STEP);events.push(...d.events.map(name=>({name,scene:d.state,time:d.time})));
 if(d.requestedLevel){d.setLevel(loaded.get(d.requestedLevel));renderer.clocks.clear();}
 sync();for(const name of d.events)pendingAudio.push(audio.cue(name));render();
}
function state(){return {scene:d.state,time:d.time,music:audio.musicName,context:audio.ctx?.state,paused:d.paused,
 p:d.game?{x:d.game.p.x,y:d.game.p.y,pose:d.game.p.pose,face:d.game.p.face,wall:d.game.p.wall,hp:d.game.p.hp,ammo:d.game.p.ammo,box:d.game.p.box}:null,
 camera:{x:d.camera.x,y:d.camera.y},combo:d.game?.combo,attackTime:d.game?.attackTime,level:d.game?.level.id,retries:d.game?.retries,
 calls,completed:[...d.completed],events,error:audio.error?.message,blocking:d.state==='home-intro'?introBlocking(d.time):null};}
async function unlock(){await audio.start('../assets/audio/manifest.json');sync();}
document.querySelector('#sound').textContent='UNLOCK AUDIO';
document.querySelector('#sound').onclick=async()=>{await unlock();};
document.querySelector('#sfx').onclick=()=>{audio.sfxMuted=!audio.sfxMuted;sync();};
document.querySelector('#pause').onclick=()=>tick({pausePressed:true});
canvas.addEventListener('pointerdown',()=>input.pending.add('confirm'));
let last=0,acc=0;
function frame(ms){
 const dt=Math.min(.05,(ms-last)/1000||0);last=ms;
 if(queue&&!d.paused&&visibility.visible){
  const held=input.poll(navigator.getGamepads?.());acc+=dt;
  acc=runSteps(acc,input.pending,edges=>{if(queue?.inputs.length)tick({...input.snapshot(held,edges),...queue.inputs.shift()});else if(queue){const done=queue.resolve;queue=null;done(state());}});
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);render();
window.heroLab={state,assets,renderer,audio,input,tick,
 async inspect(inputs){
  const seen=new Set(),captures=[],frames={};
  for(const i of inputs){tick(i);const p=d.game?.p;if(!p)continue;
   for(const call of calls){(frames[call.pose]??=new Set()).add(call.frame);}
   const attack=d.game.attackTime,a=attack?COMBO[d.game.combo-1]:null;
   const phase=a?attack<a.windup?'startup':attack<a.windup+a.active?'active':'recovery':null;
   const label=p.pose+(phase?`-${phase}`:'')+(p.wall?'-on-wall':'')+(p.face<0?'-left':'');
   if(!seen.has(label)){seen.add(label);captures.push({label,state:state(),png:canvas.toDataURL('image/png').split(',')[1]});}
  }
  await Promise.all(pendingAudio);pendingAudio=[];
  return {captures,frames:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,[...v]])),end:state()};
 },
 async run(inputs){for(const i of inputs)tick(i);await Promise.all(pendingAudio);pendingAudio=[];return state();},
 play(inputs){return new Promise(resolve=>{acc=0;queue={inputs:[...inputs],resolve};});},
 reset(){d=new SceneDirector();input.clear();renderer.clocks.clear();events=[];render();return state();},
 async flush(){await Promise.all(pendingAudio);pendingAudio=[];return state();},
 async record(){const stream=canvas.captureStream(60);if(audio.ctx){const dest=audio.ctx.createMediaStreamDestination();audio.master.connect(dest);this.recordDest=dest;stream.addTrack(dest.stream.getAudioTracks()[0]);}
  this.stream=stream;this.chunks=[];this.recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'});this.recorder.ondataavailable=e=>this.chunks.push(e.data);this.recorder.start();},
 async endRecord(){await new Promise(resolve=>{this.recorder.onstop=resolve;this.recorder.stop();});this.stream.getTracks().forEach(t=>t.stop());if(this.recordDest)audio.master.disconnect(this.recordDest);
  const bytes=new Uint8Array(await new Blob(this.chunks).arrayBuffer());let text='';for(let n=0;n<bytes.length;n+=8192)text+=String.fromCharCode(...bytes.subarray(n,n+8192));return btoa(text);},
 async stop(){visibility.destroy();input.destroy();await audio.stop();}
};
window.addEventListener('pagehide',()=>audio.stop());
