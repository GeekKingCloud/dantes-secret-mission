// Imported only by the isolated browser driver into the actual /index.html page.
// No alternate game, assets, renderer or level set. Inputs only; no state setters.
import * as game from '../runtime.mjs';
import {enemyVisual} from '../enemy-animation.mjs';
import {canFinish,COMBO,slashBox} from '../simulation.mjs';
import {introBeat} from '../scenes.mjs';
const canvas=document.querySelector('canvas'),seen=new Set(),frames={},events={},captures=[];
const drawn=new Set(),draw=game.assets.draw.bind(game.assets);
game.assets.draw=(ctx,group,id,pose,...args)=>{drawn.add(`${group}/${id}/${pose}`);return draw(ctx,group,id,pose,...args);};
export function state(){const d=game.director,g=d.game;return {scene:d.state,time:d.time,paused:d.paused,completed:[...d.completed],selection:d.selection,level:g?.level.id,p:g?{x:g.p.x,y:g.p.y,hp:g.p.hp,ammo:g.p.ammo,pose:g.p.pose,face:g.p.face,dash:g.p.dash,wall:g.p.wall}:null,retries:g?.retries,won:g?.won,camera:{x:d.camera.x,y:d.camera.y},audio:{context:game.audio.ctx?.state,music:game.audio.musicName,error:game.audio.error?.message},enemies:g?.enemies.map(e=>({id:e.id,type:e.type,x:e.x,y:e.y,face:e.face,alive:e.alive,hp:e.hp,weak:e.weak,state:e.state,track:e.attackTrack,visual:enemyVisual(e,game.assets.get('characters',e.type,e.pose)),finish:canFinish(g.p,e,g.level)}))};}
function capture(label){if(seen.has(label))return;seen.add(label);game.renderer.draw(game.director);const g=game.director.game;captures.push({label,state:state(),geometry:g?{body:g.p.box,slash:g.attackTime?slashBox(g.p,g.combo):null}:null,png:canvas.toDataURL('image/png').split(',')[1]});}
function observe(){
 const d=game.director,g=d.game;
 if(d.state==='home-intro'){const beat=introBeat(d.time);if(beat!=='departure'||d.time>4.3)capture(`home-${beat}`);return;}
 if(!g||!['stage','boss'].includes(d.state))return;
 for(const event of g.events)events[event]=(events[event]||0)+1;
 const onScreen=e=>e.x>d.camera.x+60&&e.x<d.camera.x+580&&e.y>d.camera.y+65&&e.y<d.camera.y+345;
 if(g.p.wall&&g.p.y<g.level.spawn.y-100)capture(`${g.level.id}-scene-tall-wall`);
 if(g.level.id==='stage2'&&g.p.y<-2100)capture('stage2-scene-crown-height');
 if(g.level.hazards.some(h=>h.type==='spikes'&&Math.abs(h.x-g.p.x)<160&&Math.abs(h.y-g.p.y)<170))capture(`${g.level.id}-scene-spike-decision`);
 for(const e of g.enemies){
  const v=enemyVisual(e,game.assets.get('characters',e.type,e.pose));if(!v.visible)continue;
  const key=[e.type,v.track||'',v.phase].filter(Boolean).join('-');(frames[key]??=new Set()).add(v.frame);
  if(onScreen(e)){
   if(!['windup','active','recovery'].includes(v.phase)||(e.timer<e.stateDuration*.7&&e.timer>e.stateDuration*.25))capture(`${g.level.id}-${key}`);
   if(e.weak)capture(`${g.level.id}-${e.type}-weak-red`);
   if(canFinish(g.p,e,g.level))capture(`${g.level.id}-${e.type}-rear-cue`);
   if(e.weak&&g.p.dash)capture(`${g.level.id}-${e.type}-dash-through`);
  }
 }
 if(g.events.includes('venom'))capture(`${g.level.id}-venom-mouth`);
 if(g.p.pose==='finisher')capture(`${g.level.id}-execution`);
 if(g.p.wall&&g.attackTime)capture(`${g.level.id}-wall-sword`);
 if(g.p.wall&&g.events.includes('laser'))capture(`${g.level.id}-wall-laser`);
 const swing=g.attackTime?COMBO[g.combo-1]:null;
 const phase=swing?(g.attackTime<swing.windup?'startup':g.attackTime<swing.windup+swing.active?'active':'recovery'):'';
 capture(`${g.level.id}-hero-${g.p.pose}${phase?'-'+phase:''}${g.p.wall?'-wall':''}${g.p.face<0?'-left':''}`);
}
export async function run(inputs,{paced=false}={}){
 game.setReplayMode(true);
 if(paced){let n=0,acc=0,last=performance.now();while(n<inputs.length){const now=await new Promise(requestAnimationFrame);acc+=Math.min(.05,(now-last)/1000);last=now;while(acc>=1/120&&n<inputs.length){await game.advance(inputs[n++]);observe();acc-=1/120;}}}
 else for(const i of inputs){await game.advance(i,{render:false});observe();}
 game.renderer.draw(game.director);
 return state();
}
export function drain(){const result=captures.splice(0);return result;}
export function proof(){return {state:state(),frames:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,[...v]])),events,drawn:[...drawn]};}
let recorder,parts,stream,dest;
export function record({audio=true}={}){dest=null;stream=canvas.captureStream(60);if(audio&&game.audio.ctx){dest=game.audio.ctx.createMediaStreamDestination();game.audio.master.connect(dest);stream.addTrack(dest.stream.getAudioTracks()[0]);}parts=[];recorder=new MediaRecorder(stream,{mimeType:audio?'video/webm;codecs=vp8,opus':'video/webm;codecs=vp8'});recorder.ondataavailable=e=>parts.push(e.data);recorder.start();}
export async function endRecord(){await new Promise(r=>{recorder.onstop=r;recorder.stop();});stream.getTracks().forEach(t=>t.stop());if(dest)game.audio.master.disconnect(dest);const bytes=new Uint8Array(await new Blob(parts).arrayBuffer());let text='';for(let n=0;n<bytes.length;n+=8192)text+=String.fromCharCode(...bytes.subarray(n,n+8192));return btoa(text);}
export {game};
