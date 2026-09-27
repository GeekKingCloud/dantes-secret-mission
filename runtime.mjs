import {AssetLibrary} from './asset-loader.mjs';
import {Renderer} from './renderer.mjs';
import {SceneDirector} from './scenes.mjs';
import {loadLevel} from './level-schema.mjs';
import {BrowserInput,runSteps} from './input.mjs';
import {AudioEngine,bindAudioVisibility} from './audio.mjs';
import {STEP} from './simulation.mjs';

const canvas=document.querySelector('canvas'),overlay=document.querySelector('#overlay');
const title=document.querySelector('#title'),message=document.querySelector('#message');
const start=document.querySelector('#start'),status=document.querySelector('#status');
const pause=document.querySelector('#pause'),music=document.querySelector('#sound'),sfx=document.querySelector('#sfx');
const assets=new AssetLibrary(),director=new SceneDirector(),renderer=new Renderer(canvas,assets);
const input=new BrowserInput(),audio=new AudioEngine();
let ready=false,last=0,acc=0,levelLoading=false,replayMode=false,loadingPromise=null;
const visibility=bindAudioVisibility(audio,()=>{input.clear();acc=0;if(['stage','boss','home-intro'].includes(director.state))director.paused=true;});
function reportError(error){director.state='error';director.error=error.message;overlay.classList.remove('hidden');title.textContent='Missing integration assets';message.textContent=error.message;start.hidden=true;status.textContent='DEVELOPMENT ERROR · NO PLACEHOLDER ART';audio.sync(false,null);}
function audioGesture(){audio.start().catch(error=>{status.textContent=`AUDIO UNAVAILABLE: ${error.message}`;});}
function confirm(){audioGesture();input.pending.add('confirm');}
start.addEventListener('click',confirm);
pause.addEventListener('click',()=>input.pending.add('pause'));
music.addEventListener('click',()=>{audioGesture();audio.musicMuted=!audio.musicMuted;music.textContent=audio.musicMuted?'MUSIC OFF':'MUSIC ON';});
sfx.addEventListener('click',()=>{audioGesture();audio.sfxMuted=!audio.sfxMuted;sfx.textContent=audio.sfxMuted?'SFX OFF':'SFX ON';});
canvas.addEventListener('pointerdown',()=>{if(!['stage','boss','loading','error'].includes(director.state))confirm();});
window.addEventListener('keydown',event=>{if(['Enter','Space'].includes(event.code)&&!event.repeat)audioGesture();});

window.addEventListener('pagehide',()=>audio.stop());
async function importLevel(id){
  levelLoading=true;
  try{const level=await loadLevel(`levels/${id}.json`);if(level.id!==id)throw new Error(`Level ID mismatch: expected ${id}`);director.setLevel(level);input.clear();acc=0;}
  catch(error){reportError(error);}finally{levelLoading=false;}
}
function menuUI(){
  if(director.state==='error')return;
  const menu=['title','map','world2'].includes(director.state)||director.paused;
  overlay.classList.toggle('hidden',!menu);
  // The full cover belongs only to entry; scene menus leave the canvas visible.
  overlay.classList.toggle('title-menu',director.state==='title');
  overlay.classList.toggle('scene-menu',director.state!=='title');
  title.textContent=director.paused?'Mission paused':director.state==='title'?'Kagebot’s Secret Mission':director.state==='map'?'Choose your route':'World 2 — Coming soon';
  message.textContent=director.state==='title'?'Play in your browser. No install required.':director.state==='map'?`${director.selection===0?'Home':director.selection===4?'Portal':`Stage ${director.selection}`} · ${director.unlocked(['home','stage1','stage2','stage3','portal'][director.selection])?'Available':'Locked'}`:'Keyboard, touch and standard controller supported.';
  start.textContent=director.paused?'RESUME':director.state==='title'?'BEGIN MISSION':director.state==='map'?'PLAY SELECTED':'RETURN TO MAP';
  pause.textContent=director.paused?'RESUME':'PAUSE';
}
function updateInput(i){
  const menu=['title','map','world2'].includes(director.state)||director.paused;
  if(director.state==='home-intro'&&i.jumpPressed)i.confirmPressed=true;
  if(menu&&(i.jumpPressed||i.pausePressed)){i.confirmPressed=true;i.pausePressed=false;audioGesture();}
  director.update(i,STEP);
  for(const event of director.events)audio.cue(event).catch(error=>{status.textContent=`AUDIO ERROR: ${error.message}`;});
  if(director.requestedLevel&&!levelLoading)loadingPromise=importLevel(director.requestedLevel);
}
// Deterministic input replay uses this same shipping controller/loader/render path.
// Test drivers may supply input edges, never replace state, assets or the renderer.
export function setReplayMode(value){replayMode=value;acc=0;input.clear();}
export async function advance(i,{render=true}={}){
  if(!ready||director.state==='error')throw new Error('Runtime is not ready');
  updateInput({...i});if(loadingPromise){await loadingPromise;loadingPromise=null;}
  if(render)renderer.draw(director);menuUI();audio.sync(!director.paused&&visibility.visible,director.music);
}
export {director,renderer,assets,audio,input};
function frame(ms){
  const dt=Math.min(.05,(ms-last)/1000||0);last=ms;
  const held=input.poll(navigator.getGamepads?.());
  if(ready&&!replayMode&&director.state!=='error'&&!document.hidden&&visibility.visible){
    acc+=dt;
    acc=runSteps(acc,input.pending,edges=>{
      const i=input.snapshot(held,edges);
      updateInput(i);
    });
    try{renderer.draw(director);}catch(error){reportError(error);}
    menuUI();
  }else acc=0;
  audio.sync(ready&&visibility.visible&&!document.hidden&&!director.paused&&director.state!=='error',director.music);
  if(audio.error)status.textContent=`AUDIO ERROR: ${audio.error.message}`;
  requestAnimationFrame(frame);
}
try {
  for(const group of ['characters','world','ui'])await assets.loadGroup(group,`assets/${group}/manifest.json`);
  assets.requireCharacters();
  ready=true;start.disabled=false;status.textContent='WORLD 1 · READY';menuUI();
}catch(error){reportError(error);}
requestAnimationFrame(frame);
