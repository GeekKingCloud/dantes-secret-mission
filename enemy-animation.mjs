// Frame selection is presentation only: no hitbox, timer or reward mutations.
import {clamp} from './geometry.mjs';
export function enemyVisual(e,asset) {
 const choose=(frames,elapsed,duration)=>frames[Math.min(frames.length-1,Math.max(0,Math.floor(clamp(elapsed/duration,0,.999999)*frames.length)))];
 if(!e.alive){const a=asset.animations.defeat,duration=a.frames.length/a.fps;return {animation:'defeat',frame:choose(a.frames,e.defeatTime,duration),visible:e.defeatTime<duration+.15,alpha:clamp((duration+.15-e.defeatTime)/.15,0,1),phase:'defeat'};}
 if(e.stun>0){const a=asset.animations.hurt;return {animation:'hurt',frame:choose(a.frames,.17-e.stun,.17),visible:true,alpha:1,phase:'hurt'};}
 const phase={windup:'windup',attack:'active',recover:'recovery'}[e.state];
 if(phase&&e.attackTrack){
  const track=asset.combatPhases[e.attackTrack],segment=track[phase];
  const delay=phase==='recovery'?(e.recoveryVisualStart||0):0;
  const duration=e.stateDuration-delay,elapsed=e.stateDuration-e.timer-delay;
  return {animation:e.pose,frame:choose(segment.frames,elapsed,duration),visible:true,alpha:1,phase,track:e.attackTrack};
 }
 const a=asset.animations[e.pose],index=Math.floor((e.animationTime||0)*a.fps);
 return {animation:e.pose,frame:a.frames[a.loop?index%a.frames.length:Math.min(index,a.frames.length-1)],visible:true,alpha:1,phase:e.pose};
}
