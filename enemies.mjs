import {bodyBox, overlap, clamp, moveBody} from './geometry.mjs';
export const ENEMY_TYPES = Object.freeze({
  zombie:{hp:3,weakAt:1,w:24,h:40,speed:30,notice:140,reach:33,windup:.48,active:.18,recover:.7},
  bear:{hp:6,weakAt:2,w:46,h:55,speed:42,notice:200,reach:82,windup:.65,active:.25,recover:.9},
  ghost:{hp:3,weakAt:1,w:30,h:35,speed:40,notice:260,reach:200,windup:.7,active:.48,recover:1.1},
  spider:{hp:3,weakAt:1,w:28,h:28,speed:28,notice:290,reach:250,windup:.6,active:.15,recover:1.2},
  'masked-mutant-boss':{hp:24,weakAt:6,w:48,h:78,speed:76,notice:1000,reach:110,windup:.8,active:.3,recover:.85},
});
export const enemyBox = e => bodyBox(e,ENEMY_TYPES[e.type]);
export const isWeak = e => e.alive&&e.hp<=ENEMY_TYPES[e.type].weakAt;
export function createEnemy(spec) {
  return {...structuredClone(spec),homeX:spec.x,homeY:spec.y,hp:ENEMY_TYPES[spec.type].hp,
    maxHp:ENEMY_TYPES[spec.type].hp,alive:true,state:'patrol',timer:0,stun:0,hitSwing:-1,
    pose:spec.type==='ghost'?'hover':spec.type==='spider'?'wall-idle':'idle',
    active:spec.type!=='masked-mutant-boss',pattern:0,vx:0,vy:0,fired:false,defeatTime:0,turnWait:.4,weak:false};
}
function enter(e,state,duration) {e.state=state;e.timer=duration;e.fired=false;}
function facePlayer(e,p) {e.face=Math.sign(p.x-e.x)||e.face;}
export function enemyAttackBox(e) {
  const t=ENEMY_TYPES[e.type];
  return {x:e.face>0?e.x-4:e.x-t.reach,y:e.y-t.h,w:t.reach+4,h:t.h-4};
}
function patrol(e,level,dt) {
  const t=ENEMY_TYPES[e.type];
  if(e.type==='spider') {
    e.y+=e.face*t.speed*dt;
    if(e.y<=e.patrol.min||e.y>=e.patrol.max){e.y=clamp(e.y,e.patrol.min,e.patrol.max);e.face*=-1;}
    e.pose='climb';return;
  }
  const min=e.arena?e.arena.x+t.w/2:e.patrol.min, max=e.arena?e.arena.x+e.arena.w-t.w/2:e.patrol.max;
  if(e.x<=min||e.x>=max)e.face=e.x<=min?1:-1;
  if(e.type==='ghost') {
    e.x=clamp(e.x+e.face*t.speed*dt,min,max);e.y=e.homeY+Math.sin(e.phase)*9;e.pose='hover';return;
  }
  // Turn at ledges or physical walls, not only author patrol limits.
  const ahead=e.x+e.face*(t.w/2+4);
  const support=[...level.surfaces,...level.walls].some(s=>ahead>=s.x&&ahead<=s.x+s.w&&Math.abs(e.y-s.y)<3);
  if(!support)e.face*=-1;
  e.vy=Math.min(720,e.vy+1900*dt);
  const hit=moveBody(e,t,level,e.face*t.speed*dt,e.vy*dt);
  if(hit.hitX)e.face*=-1;if(hit.hitY)e.vy=0;
  e.x=clamp(e.x,min,max);e.pose=e.type==='masked-mutant-boss'?'move':'walk';
}
export function updateEnemy(e,g,dt) {
  if(!e.alive){e.defeatTime+=dt;e.pose='defeat';return;}
  if(!e.active)return;
  e.weak=isWeak(e);
  e.phase=(e.phase||0)+dt*2;e.timer=Math.max(0,e.timer-dt);e.stun=Math.max(0,e.stun-dt);
  if(e.stun){e.pose='hurt';return;}
  const p=g.p,t=ENEMY_TYPES[e.type],distance=Math.hypot(p.x-e.x,p.y-e.y);
  const boss=e.type==='masked-mutant-boss';
  if(e.state==='patrol'||e.state==='approach') {
    const verticalOK=e.type==='ghost'||e.type==='spider'||Math.abs(p.y-e.y)<60;
    const trigger=e.type==='zombie'||e.type==='bear'?t.reach+18:t.notice;
    const noticed=distance<t.notice&&verticalOK;
    const facing=Math.sign(p.x-e.x)===e.face;
    if(noticed&&!facing){e.turnWait-=dt;if(e.turnWait<=0){facePlayer(e,p);e.turnWait=.45;}}
    else e.turnWait=.45;
    e.state=noticed?'approach':'patrol';
    if(distance<trigger&&verticalOK&&(facing||e.type==='ghost'||e.type==='spider')) {
      e.target={x:p.x,y:p.y};enter(e,'windup',boss&&e.hp<=e.maxHp/2?.58:t.windup);
      e.pose=boss?'windup':e.type==='bear'?'slash-windup':e.type==='ghost'?'dive-windup':e.type==='spider'?'venom-windup':'attack';
    }else if(!noticed||facing)patrol(e,g.level,dt);
    else e.pose=e.type==='ghost'?'hover':e.type==='spider'?'wall-idle':'idle';
  } else if(e.state==='windup') {
    e.pose=boss?'windup':e.type==='bear'?'slash-windup':e.type==='ghost'?'dive-windup':e.type==='spider'?'venom-windup':'attack';
    if(!e.timer) {
      enter(e,'attack',boss&&e.pattern%2===1?.42:t.active);
      const dx=e.target.x-e.x,dy=e.target.y-e.y,len=Math.hypot(dx,dy)||1;
      e.vx=dx/len*380;e.vy=dy/len*380;
      g.events.push(e.type==='ghost'?'ghost-dive':e.type==='bear'?'bear-slash':'sword');
    }
  } else if(e.state==='attack') {
    if(e.type==='spider') {
      e.pose='spit';
      if(!e.fired){e.fired=true;g.projectiles.push({owner:'enemy',kind:'venom',x:e.x,y:e.y-14,vx:e.vx*.55,vy:e.vy*.55,life:2.5});g.events.push('venom');}
    } else if(e.type==='ghost') {
      e.pose='dive';e.x+=e.vx*dt;e.y+=e.vy*dt;
      if(overlap(enemyBox(e),p.box))g.damagePlayer(1,e.x);
    } else {
      e.pose=boss?(e.pattern%2?'burst':'slash'):e.type==='bear'?'slash':'attack';
      if(boss&&e.pattern%2) {
        moveBody(e,t,g.level,e.face*330*dt,0);
        e.x=clamp(e.x,e.arena.x+t.w/2,e.arena.x+e.arena.w-t.w/2);
      }
      if(overlap(enemyAttackBox(e),p.box))g.damagePlayer(1,e.x);
    }
    if(!e.timer){enter(e,'recover',t.recover);e.pattern++;}
  } else {
    e.pose=e.type==='ghost'?'hover':e.type==='spider'?'wall-idle':'idle';
    if(e.type==='ghost') {e.x+=(e.homeX-e.x)*Math.min(1,dt*3);e.y+=(e.homeY-e.y)*Math.min(1,dt*3);}
    if(!e.timer){enter(e,'patrol',0);e.turnWait=.45;}
  }
}
