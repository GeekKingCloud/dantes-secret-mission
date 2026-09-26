import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STEP, canFinish} from '../../simulation.mjs';
import {ENEMY_TYPES, enemyBox, isWeak} from '../../enemies.mjs';
import {bodyBox, overlap, solids} from '../../geometry.mjs';
import {BODY} from '../../player-controller.mjs';
import {validateLevel} from '../../level-schema.mjs';
import {SceneDirector, VIEW} from '../../scenes.mjs';

const level = validateLevel(JSON.parse(readFileSync(new URL('../../levels/stage1.json', import.meta.url))));
const blocks = solids(level);
const support = (x, y, w) => {
  const spans = level.surfaces.concat(level.walls).filter(s => Math.abs(s.y-y)<0.1)
    .map(s => [s.x,s.x+s.w]).sort((a,b) => a[0]-b[0]);
  let edge = x-w/2;
  for (const [left,right] of spans) if (left<=edge && right>edge) edge=right;
  return edge>=x+w/2;
};
function geometry() {
  for (let i=0;i<blocks.length;i++) for (let j=i+1;j<blocks.length;j++)
    assert(!overlap(blocks[i],blocks[j]), `solid overlap ${blocks[i].id}/${blocks[j].id}`);
  for (const roof of level.surfaces.filter(s=>s.kind==='solid'))
    assert(level.walls.some(w=>w.x===roof.x && w.w===roof.w && w.y===roof.y+roof.h), `${roof.id}: aligned wall under cap`);
  for (const spawn of [level.spawn,...level.checkpoints.map(c=>c.spawn)]) {
    assert(support(spawn.x,spawn.y,BODY.w),'spawn supported');
    const box=bodyBox(spawn,BODY);
    assert(!blocks.some(s=>overlap(box,s)),'spawn not inside solid');
    assert(!level.hazards.some(h=>overlap(box,h)),'spawn hazard-free');
    for(const e of level.enemies.filter(e=>['zombie','bear'].includes(e.type))) {
      if(Math.abs(e.y-spawn.y)<60)
        assert(spawn.x<e.patrol.min-ENEMY_TYPES[e.type].reach-BODY.w/2 || spawn.x>e.patrol.max+ENEMY_TYPES[e.type].reach+BODY.w/2,'spawn outside patrol strike envelope');
    }
  }
  for(const e of level.enemies) {
    assert(!blocks.some(s=>overlap(enemyBox(e),s)),`${e.id}: spawn clear`);
    if(['zombie','bear'].includes(e.type))
      for(let x=e.patrol.min;x<=e.patrol.max;x++) assert(support(x,e.y,ENEMY_TYPES[e.type].w),`${e.id}: unsupported patrol at ${x}`);
    if(e.type==='ghost') {
      // Current AI commits a 380px/s dive for .48s. Include an extra fixed tick,
      // hover amplitude and body extent, not only the tested route's direction.
      const reach=380*(ENEMY_TYPES.ghost.active+STEP), t=ENEMY_TYPES.ghost;
      const envelope={x:e.patrol.min-reach-t.w/2,y:e.y-9-reach-t.h,w:e.patrol.max-e.patrol.min+2*reach+t.w,h:18+2*reach+t.h};
      assert(!blocks.some(s=>overlap(envelope,s)),`${e.id}: patrol-origin dive envelope must remain clear of solids`);
    }
    if(e.type==='spider') {
      const wall=level.walls.find(w=>w.id===e.wallId);
      assert(e.patrol.min-ENEMY_TYPES.spider.h>=wall.y && e.patrol.max<=wall.y+wall.h,'spider vertical range alongside wall');
      for(let y=e.patrol.min;y<=e.patrol.max;y++) assert(!blocks.some(s=>overlap(enemyBox({...e,y}),s)),'spider patrol clear');
    }
  }
  assert.deepEqual(new Set(level.background.map(b=>b.asset)),new Set(['sky','moon','far-mountains','distant-temples','far-clouds','near-clouds']));
  const clouds=level.background.filter(b=>b.asset.endsWith('clouds'));
  assert(clouds.every(b=>b.driftX!==0) && clouds[0].factorX!==clouds[1].factorX && clouds[0].driftX!==clouds[1].driftX);
  const worldKeys=new Set('sky moon far-mountains distant-temples far-clouds near-clouds roof-left roof-center roof-right roof-ridge wall wood-beam eave stone spikes-top spikes-side lantern home-interior table-candle overworld boss-arena portal-animation'.split(' '));
  for(const key of [...level.surfaces,...level.walls,...level.hazards].map(o=>o.art).filter(Boolean).concat(level.background.map(o=>o.asset),level.decor.map(o=>o.asset))) assert(worldKeys.has(key),`unknown asset ${key}`);
  assert.equal(level.boss,null);assert.equal(level.exit.requiresBoss,false);assert.equal(level.music,'stage1-approved');
  assert.deepEqual(VIEW,{w:640,h:360});
  console.log('geometry: aligned roof/wall solids, safe spawns, full patrol support, spider clearance, contract keys and six layers PASS');
}

// The only gameplay writes are input objects passed to update(). No state repair,
// teleport, hitEnemy/damagePlayer/reset calls, altered tuning or fixture levels.
function makeRoute(label) {
  const director=new SceneDirector();director.setLevel(level);
  const g=director.game, camera=director.camera;
  let frames=0, phase='start', minHP=4, cameraMin=Infinity, cameraMax=-Infinity;
  const events={}, states=new Map(g.enemies.map(e=>[e.id,new Set()])), combos=new Set(), checkpoints=new Set(), finishers=[];
  function obstruction(reason) {
    console.error(JSON.stringify({route:label,phase,reason,frame:frames,player:{x:g.p.x,y:g.p.y,hp:g.p.hp,vx:g.p.vx,vy:g.p.vy,wall:g.p.wall,on:g.p.on},enemies:g.enemies.filter(e=>e.alive).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,state:e.state,face:e.face}))},null,2));
    throw new Error(`${phase}: ${reason}`);
  }
  function tick(input={}) {
    if(++frames>30000) obstruction('global 250-second input budget exhausted');
    const before=g.enemies.filter(e=>canFinish(g.p,e,level)).map(e=>({id:e.id,ammo:g.p.ammo}));
    director.update(input,STEP);
    minHP=Math.min(minHP,g.p.hp);
    for(const event of g.events) events[event]=(events[event]||0)+1;
    if(g.attackTime) combos.add(g.combo);
    if(g.checkpointId) checkpoints.add(g.checkpointId);
    if(input.finishPressed) for(const e of before) if(!g.enemies.find(n=>n.id===e.id).alive) finishers.push({...e,afterAmmo:g.p.ammo});
    for(const e of g.enemies) {
      states.get(e.id).add(e.state);
      if(!e.alive)continue;
      if(blocks.some(s=>overlap(enemyBox(e),s))) obstruction(`live ${e.id} overlaps solid`);
      if(['zombie','bear'].includes(e.type) && !support(e.x,e.y,ENEMY_TYPES[e.type].w)) obstruction(`${e.id} unsupported in simulation`);
    }
    cameraMin=Math.min(cameraMin,camera.y);cameraMax=Math.max(cameraMax,camera.y);
  }
  function until(name,done,input,max=1200) {
    phase=name;
    for(let n=0;n<max;n++) {if(done())return;tick(typeof input==='function'?input(n):input);}
    if(!done())obstruction(`step limit ${max}`);
  }
  function wait(n) {for(let i=0;i<n;i++)tick();}
  function moveTo(x) {
    until(`walk to ${x}`,()=>Math.abs(g.p.x-x)<3 && Math.abs(g.p.vx)<8 && g.p.on,()=>{
      const d=x-g.p.x,brake=g.p.vx*g.p.vx/6600+2;
      return Math.abs(d)<=brake && Math.sign(d)===Math.sign(g.p.vx)?{}:{right:d>0,left:d<0};
    });
  }
  function jumpTo(x,y) {
    let jumped=false,second=false,kicked=false;
    until(`traverse to ${x},${y}`,()=>g.p.on && Math.abs(g.p.x-x)<5 && Math.abs(g.p.y-y)<1,()=>{
      const p=g.p,d=x-p.x,i={right:d>3,left:d<-3,jump:true};
      if(p.wall)second=false; // Wall contact genuinely refreshes the controller's air jump.
      if(!jumped && p.on){i.jumpPressed=true;jumped=true;}
      if(p.wall && p.y>y+27)i.climb=true;
      else if(p.wall && !kicked){i.jumpPressed=true;kicked=true;}
      else if(!p.on && p.vy>=0 && p.y>y-12 && !second && !p.kick && !p.wall){i.jumpPressed=true;second=true;}
      if(Math.abs(d)<p.vx*p.vx/6600+2){i.right=false;i.left=false;}
      return i;
    },1800);
    wait(8);
  }
  function approach(e,distance) {
    until(`approach ${e.id} at ${distance}`,()=>Math.abs(e.x-g.p.x)<=distance,()=>({right:e.x>g.p.x,left:e.x<g.p.x}));
    wait(10);
  }
  function telegraph(e) {
    approach(e,ENEMY_TYPES[e.type].reach+14);
    until(`see ${e.id} windup`,()=>e.state==='windup',{},240);
    const escape=g.p.x-125;
    moveTo(escape);
    until(`see ${e.id} active/recovery`,()=>e.state==='recover',{},240);
  }
  function fight(e,finish=false) {
    approach(e,e.type==='bear'?85:finish?78:64);
    if(finish)until(`face-to-face ${e.id}`,()=>e.face===Math.sign(g.p.x-e.x),{},120);
    let presses=0;
    until(`sword ${e.id}`,()=>finish?isWeak(e):!e.alive,n=>{
      const i={};
      if(g.p.face!==Math.sign(e.x-g.p.x)){i.right=e.x>g.p.x;i.left=e.x<g.p.x;}
      if(n%16===0){i.attackPressed=true;presses++;}
      return i;
    },480);
    if(finish) {
      assert(isWeak(e));assert(!canFinish(g.p,e,level),'front finisher must not be available');
      tick({finishPressed:true});assert(e.alive,'front execution refused');
      until(`dash ready ${e.id}`,()=>!g.p.dashCD && g.p.on,{},120);
      const hp=g.p.hp;
      tick({right:true,dashPressed:true});
      until(`buffered dash starts ${e.id}`,()=>g.p.dash>0,{},20);
      until(`cross ${e.id}`,()=>!g.p.dash,{},40);
      assert.equal(g.p.hp,hp,'dash through body without damage');
      assert(g.p.box.x>=enemyBox(e).x+enemyBox(e).w,'full body clearance');
      tick({left:true});
      assert(canFinish(g.p,e,level),'rear window after turn');
      const ammo=g.p.ammo;
      tick({finishPressed:true});
      assert(!e.alive,'rear finisher defeats enemy');assert.equal(g.p.ammo,Math.min(4,ammo+1));
      wait(6);tick({finishPressed:true});wait(6);
      assert.equal(g.p.ammo,Math.min(4,ammo+1),'no duplicate refund after a released and repeated press');
    }
    wait(45);
    console.log(`${label}: ${e.id} defeated at ${(frames*STEP).toFixed(2)}s; HP ${g.p.hp}; ammo ${g.p.ammo}; ${presses} attack edges; rear=${finish}`);
  }
  function ranged(e) {
    const lasersBefore=events.laser||0;
    until(`air intercept ${e.id}`,()=>!e.alive,n=>{
      const p=g.p, i={jump:true};
      if(e.x-p.x>100)i.right=true;
      if(e.x-p.x<45)i.left=true;
      if(p.face!==Math.sign(e.x-p.x)){i.right=e.x>p.x;i.left=e.x<p.x;}
      if(p.on || (p.vy>0 && p.airJumps && p.y>e.y+25))i.jumpPressed=true;
      if(Math.abs((p.y-25)-(e.y-ENEMY_TYPES[e.type].h/2))<15 && e.x-p.x<130 && !g.laserCD && p.ammo && n%2===0)i.laserPressed=true;
      if(n%16===0)i.attackPressed=true;
      return i;
    },1200);
    until(`land after ${e.id}`,()=>g.p.on,{},360);
    wait(40);
    console.log(`${label}: ${e.id} intercepted; lasers fired ${(events.laser||0)-lasersBefore}; HP ${g.p.hp}; ammo ${g.p.ammo}`);
  }
  return {g,director,tick,until,wait,moveTo,jumpTo,approach,telegraph,fight,ranged,states,events,finishers,checkpoints,combos,
    summary:()=>({frames,seconds:Number((frames*STEP).toFixed(2)),simulationSeconds:Number(g.time.toFixed(2)),minHP,ammo:g.p.ammo,retries:g.retries,defeated:g.enemies.filter(e=>!e.alive).length,finishers,events,checkpoints:[...checkpoints],cameraY:[cameraMin,cameraMax]})};
}

geometry();
const r=makeRoute('combat-clear'),{g}=r;
// Spend a real charge away from enemies, making the later +1 refund measurable.
r.tick({left:true,laserPressed:true});r.wait(40);
r.moveTo(400);
r.telegraph(g.enemies[0]);r.fight(g.enemies[0]);
r.moveTo(1010);r.jumpTo(1230,260);
r.fight(g.enemies[1],true);
r.moveTo(2560);r.jumpTo(2890,160);
r.telegraph(g.enemies[2]);r.fight(g.enemies[2],true);
r.moveTo(3800);r.jumpTo(4080,120);
r.fight(g.enemies[3]);
r.moveTo(4680);
r.until('ghost acquisition in open courtyard',()=>g.enemies[4].state==='windup',{right:true},360);
const ghostBody=enemyBox(g.enemies[4]),ghostCamera=r.director.camera;
assert(ghostBody.y>=ghostCamera.y && ghostBody.x>=ghostCamera.x && ghostBody.x+ghostBody.w<=ghostCamera.x+VIEW.w,'ghost telegraph body inside native camera');
r.until('ghost commits visible dive',()=>g.enemies[4].state==='attack',{},240);
r.ranged(g.enemies[4]);
r.moveTo(5410);r.jumpTo(5580,200);r.fight(g.enemies[5]);
r.moveTo(5990);
const spike=level.hazards.find(h=>h.type==='spikes'),cam=r.director.camera;
assert(spike.x>=cam.x && spike.x+spike.w<=cam.x+VIEW.w && spike.y>=cam.y && spike.y+spike.h<=cam.y+VIEW.h-8,'whole spike collision/art rectangle visible before takeoff');
r.jumpTo(6260,120);r.fight(g.enemies[6],true);
r.moveTo(7160);
r.until('spider telegraph from safe courtyard',()=>g.enemies[7].state==='windup',{right:true},360);
r.jumpTo(7350,160);r.ranged(g.enemies[7]);
r.moveTo(7470);r.jumpTo(7760,40);
r.moveTo(8040);r.fight(g.enemies[8]);
r.until('enter departure gate',()=>g.won,{right:true},600);
assert(g.won,'reachable exit');assert.equal(g.retries,0);assert.equal(g.enemies.filter(e=>e.alive).length,0);
assert.equal(r.summary().minHP,4,'all encounters and hazards have a demonstrated damage-free route');
assert.deepEqual([...r.combos].sort(),[1,2,3]);assert(r.finishers.length>=1);
for(const state of ['approach','windup','attack','recover'])assert(r.states.get('lantern-sentry').has(state),`zombie state ${state}`);
for(const state of ['windup','attack','recover'])assert(r.states.get('bell-keeper').has(state),`bear state ${state}`);
for(const state of ['windup','attack','recover'])assert(r.states.get('courtyard-wisp').has(state),`ghost state ${state}`);
for(const state of ['windup','attack','recover'])assert(r.states.get('silk-lookout').has(state),`spider state ${state}`);
assert(r.events.venom>0,'spider fired a real projectile that the route avoided');
assert(r.events['wall-contact']>0,'real wall contact');
assert.equal(r.checkpoints.size,level.checkpoints.length);
const director=r.director;
assert.equal(director.state,'map');assert(director.completed.has('stage1'));assert(director.unlocked('stage2'));assert(!director.unlocked('stage3'));
console.log('ROUTE PASS',JSON.stringify(r.summary()));

const recovery=makeRoute('pit-recovery'), q=recovery.g;
recovery.tick({left:true,laserPressed:true});recovery.wait(40);
recovery.fight(q.enemies[0]);recovery.moveTo(920);
assert.equal(q.checkpointId,'cp-first-gap');
for(let fall=1;fall<=4;fall++) {
  recovery.until(`walk off first gutter ${fall}`,()=>q.p.x>=1065,{right:true},360);
  recovery.until(`fall to recovery ${fall}`,()=>fall===4?q.retries===1:q.p.hp===4-fall,{},1200);
  if(fall<4) {
    assert.equal(q.checkpointId,'cp-first-gap');assert.equal(q.p.x,920);assert.equal(q.p.y,300);
    assert(!q.enemies[0].alive,'nonlethal fall preserves defeated foe');assert.equal(q.p.ammo,3);
  }
}
assert.equal(q.retries,1);assert.equal(q.p.hp,4);assert.equal(q.p.ammo,4);
assert.equal(q.p.x,level.spawn.x);assert.equal(q.p.y,level.spawn.y);assert.equal(q.checkpointId,null);
assert(q.enemies.every(e=>e.alive && e.hp===ENEMY_TYPES[e.type].hp),'lethal retry restores full roster');
assert.equal(q.projectiles.length,0);assert.equal(q.time,0);
console.log('RECOVERY PASS',JSON.stringify(recovery.summary()));
