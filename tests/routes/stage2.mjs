import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LevelSimulation, STEP, canFinish} from '../../simulation.mjs';
import {validateLevel} from '../../level-schema.mjs';
import {solids, overlap, bodyBox} from '../../geometry.mjs';
import {enemyBox, ENEMY_TYPES} from '../../enemies.mjs';
import {Camera, SceneDirector, VIEW} from '../../scenes.mjs';

const level = validateLevel(JSON.parse(readFileSync(new URL('../../levels/stage2.json', import.meta.url))));
const terrain = solids(level);
const spikes = level.hazards.filter(h=>h.type==='spikes');
const supports = [...level.surfaces,...level.walls];
function supported(x,y,w) {
  return supports.some(s=>Math.abs(s.y-y)<.001 && x-w/2>=s.x && x+w/2<=s.x+s.w);
}
function clear(box) {return !terrain.some(s=>overlap(box,s)) && !level.hazards.some(h=>overlap(box,h));}
function contained(box) {
  const b=level.bounds;
  return box.x>=b.x && box.y>=b.y && box.x+box.w<=b.x+b.w && box.y+box.h<=b.y+b.h;
}
assert.equal(level.id,'stage2');
assert.equal(level.boss,null);
assert.equal(level.exit.requiresBoss,false);
assert.deepEqual(VIEW,{w:640,h:360});
for(let a=0;a<terrain.length;a++) for(let b=a+1;b<terrain.length;b++) {
  assert(!overlap(terrain[a],terrain[b]),`solid overlap ${terrain[a].id}/${terrain[b].id}`);
}
for(const box of [...supports,...level.hazards,level.exit]) assert(contained(box),`bounds ${box.id||'exit'}`);
for(const spawn of [level.spawn,...level.checkpoints.map(cp=>cp.spawn)]) {
  const box=bodyBox(spawn,{w:18,h:42});
  assert(clear(box),'safe spawn volume');
  assert(supported(spawn.x,spawn.y,18),'fully supported spawn');
  for(const e of level.enemies) {
    assert(!overlap(box,enemyBox(e)),`spawn overlaps ${e.id}`);
    if(e.type==='zombie' && Math.abs(spawn.y-e.y)<60) assert(spawn.x+60<=e.patrol.min || spawn.x-60>=e.patrol.max,`spawn lacks zombie windup room ${e.id}`);
  }
}
for(const e of level.enemies) {
  const size=ENEMY_TYPES[e.type];
  assert(!terrain.some(s=>overlap(enemyBox(e),s)),`enemy starts in solid: ${e.id}`);
  if(e.type==='zombie') for(let x=e.patrol.min;x<=e.patrol.max;x++) {
    assert(supported(x,e.y,size.w),`unsupported patrol ${e.id} at ${x}`);
    assert(clear(bodyBox({x,y:e.y},size)),`patrol obstruction ${e.id}`);
  }
  if(e.type==='spider') {
    const wall=level.walls.find(w=>w.id===e.wallId);
    assert(e.patrol.min-size.h>=wall.y && e.patrol.max<=wall.y+wall.h,'spider remains on wall');
    assert(Math.abs(e.x+size.w/2-wall.x)<.001 || Math.abs(e.x-size.w/2-wall.x-wall.w)<.001,'spider flush outside wall');
    for(let y=e.patrol.min;y<=e.patrol.max;y++) assert(clear(bodyBox({x:e.x,y},size)),`spider patrol obstruction ${e.id}`);
  }
}
for(const name of ['primer','venom','belfry','crown']) {
  const roof=level.surfaces.find(s=>s.id===`${name}-terrace-roof`);
  const wall=level.walls.find(w=>w.id===`${name}-right-wall`);
  assert.equal(roof.x,wall.x);assert.equal(roof.y+roof.h,wall.y,'roof/wall ledge alignment');
  const left=level.walls.find(w=>w.id===`${name}-left-wall`);
  const seal=level.hazards.find(h=>h.id===`${name}-outer-seal`);
  assert.equal(seal.x+seal.w,left.x);
  assert(seal.y<=left.y && seal.y+seal.h>=left.y+left.h,'no continuous outer climb bypass');
}
const worldKeys=new Set(['sky','moon','far-mountains','distant-temples','far-clouds','near-clouds','roof-left','roof-center','roof-right','roof-ridge','wall','wood-beam','eave','stone','spikes-top','spikes-side','lantern','home-interior','table-candle','overworld','boss-arena','portal-animation']);
for(const key of [...supports.map(s=>s.art),...spikes.map(h=>h.art),...level.background.map(b=>b.asset),...level.decor.map(d=>d.asset)]) assert(worldKeys.has(key),`contract art key ${key}`);
assert.deepEqual(level.background.map(b=>b.asset),['sky','moon','far-mountains','distant-temples','near-clouds']);
assert(level.background.at(-1).driftX!==0,'retained upper clouds still drift');
console.log('PASS schema, geometry, full patrol support, safe spawns, contract keys');

const g = new LevelSimulation(level);
const camera = new Camera();
let ticks = 0, label = 'spawn';
const seen = new Set(), checkpoints = new Set(), states = new Map();
export const inputs=[];
const crossings=[],capStarts=[],capClearance=new Map();
let minCameraY=Infinity,maxCameraY=-Infinity,recoveryPrefix,climbPrefix;
const snapshot = () => ({label, ticks, time:g.time, player:{x:g.p.x,y:g.p.y,vx:g.p.vx,vy:g.p.vy,wall:g.p.wall,on:g.p.on,hp:g.p.hp,ammo:g.p.ammo}, enemies:g.enemies.filter(e=>e.alive).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,state:e.state}))});
function tick(input = {}) {
  assert(++ticks < 24000, 'route global bound exceeded');
  inputs.push({...input});
  g.update(input);
  camera.follow(g.p,level.camera,STEP);
  minCameraY=Math.min(minCameraY,camera.y);maxCameraY=Math.max(maxCameraY,camera.y);
  assert(!terrain.some(s=>overlap(g.p.box,s)),`player in solid: ${JSON.stringify(snapshot())}`);
  for(const h of spikes) {
    assert(!overlap(g.p.box,h),`spike contact (even if invulnerable): ${h.id} ${JSON.stringify(snapshot())}`);
    if(h.id.endsWith('exit-cap') && g.p.box.x<h.x+h.w && g.p.box.x+g.p.box.w>h.x && g.p.y<=h.y) {
      capClearance.set(h.id,Math.min(capClearance.get(h.id)??Infinity,h.y-g.p.y));
    }
  }
  for(const e of g.events) seen.add(e);
  if(g.checkpointId) checkpoints.add(g.checkpointId);
  for(const e of g.enemies) {
    if(e.alive) assert(!terrain.some(s=>overlap(enemyBox(e),s)),`live AI solid overlap ${e.id}: ${JSON.stringify(snapshot())}`);
    if(!states.has(e.id)) states.set(e.id,new Set());
    states.get(e.id).add(e.state);
  }
  if(g.events.includes('hurt') || g.retries) throw new Error(`Unexpected damage/retry: ${JSON.stringify(snapshot())}`);
}
function until(name, condition, input, limit = 1200) {
  label = name;
  for(let n=0;n<limit;n++) {
    if(condition()) return;
    tick(typeof input==='function'?input(n):input);
  }
  throw new Error(`Obstruction after ${limit} steps: ${JSON.stringify(snapshot())}`);
}
function frames(n,input={}) {for(let k=0;k<n;k++)tick(input);}
function walkTo(x) {
  const right=x>g.p.x;
  until(`walk to ${x}`,()=>right?g.p.x>=x:g.p.x<=x,{right,left:!right},1200);
}
function climbTo(y) {
  assert(g.p.wall,`climb needs actual wall: ${JSON.stringify(snapshot())}`);
  until(`climb to ${y}`,()=>g.p.y<=y,{climb:true},1800);
}
function crossTo(side,flip=false) {
  const wall=g.p.wall;
  const start={x:g.p.x,y:g.p.y,tick:ticks};
  assert(wall && wall!==side,'cross must leave opposite actual wall');
  tick({jumpPressed:true,jump:true,right:side===1,left:side===-1});
  until('buffered wallkick',()=>g.p.kick>0,{jump:true,right:side===1,left:side===-1},30);
  assert(g.p.kick>0,'real wallkick');
  until(`regrab ${side}`,()=>g.p.wall===side,n=>({jump:true,right:side===1,left:side===-1,jumpPressed:flip && n===30}),180);
  assert(Math.abs(g.p.x-start.x)>135,'real airborne crossing, not same-wall climb');
  crossings.push({from:wall,to:side,flip,start,end:{x:g.p.x,y:g.p.y,tick:ticks}});
}
function finishZombie(id,laser=false) {
  const e=g.enemies.find(e=>e.id===id);
  until(`approach ${id}`,()=>Math.abs(g.p.x-e.x)<80,{right:true},600);
  frames(15);
  until(`wait for ${id} facing`,()=>e.face===-1,{},120);
  if(laser) {
    tick({right:true,laserPressed:true});
    until(`laser weakens ${id}`,()=>e.hp===1,{},120);
  } else {
    for(let hit=0;hit<2;hit++) {
      const hp=e.hp;tick({right:true,attackPressed:true});
      until(`sword hit ${id}`,()=>e.hp<hp,{},120);
      if(hit===0)until('sword recovery',()=>!g.attackTime,{},120);
    }
  }
  assert(e.alive && e.hp===1);
  assert(e.weak && !canFinish(g.p,e,level),'weakened red flag, front finisher refused');
  const ammo=g.p.ammo;
  tick({right:true,dashPressed:true});
  until(`dash starts ${id}`,()=>g.p.dash>0,{right:true},30);
  until(`dash through ${id}`,()=>!g.p.dash,{},60);
  assert(g.p.box.x>enemyBox(e).x+enemyBox(e).w,'dash fully clears enemy body');
  tick({left:true,finishPressed:true});
  assert(!e.alive,`rear execute failed: ${JSON.stringify(snapshot())}`);
  assert.equal(g.p.ammo,Math.min(4,ammo+1));
  console.log('encounter',id,'rear execute',g.time.toFixed(2));
}
function exitShaft(name,r,top,clearance=50,flipAt=30) {
  climbTo(top-clearance);
  assert.equal(g.p.wall,-1);
  capStarts.push({name,ticks,r,top,flipAt});
  tick({right:true,jump:true,jumpPressed:true});
  until(`${name} cap leap`,()=>g.p.on && g.p.x>r+60,n=>({right:true,jump:true,jumpPressed:n===flipAt}),240);
  console.log('terrace',name,g.time.toFixed(2),g.p.x.toFixed(1),g.p.y.toFixed(1));
}
function gap(end,next) {
  walkTo(end-45);
  tick({right:true,jump:true,jumpPressed:true});
  until(`gap ${end} to ${next}`,()=>g.p.on && g.p.x>next+20,n=>({right:true,jump:true,jumpPressed:n===30}),240);
}
function enterShaft(r,base) {
  walkTo(r-14);
  tick({right:true,jump:true,jumpPressed:true});
  until('right grab',()=>g.p.wall===1,{right:true,jump:true},120);
  climbTo(base-110);
}

finishZombie('gate-watch',true);
walkTo(570);
tick({right:true,jump:true,jumpPressed:true});
until('primer right grab',()=>g.p.wall===1,{right:true,jump:true},120);
climbPrefix=ticks;
climbTo(240);
crossTo(-1);
climbTo(200);
crossTo(1);
climbTo(160);
crossTo(-1);
exitShaft('primer',584,-120);
finishZombie('first-bell-watch');
recoveryPrefix=ticks;
gap(960,1080);
enterShaft(1564,-120);
const spider=g.enemies.find(e=>e.id==='venom-instructor');
climbTo(spider.y+24);
tick({left:true,climb:true,laserPressed:true});
until('wall laser weakens spider',()=>spider.hp===1,{},120);
assert(g.p.wall,'laser from actual wall');
crossTo(-1);
tick({right:true,attackPressed:true});
until('wall sword defeats spider',()=>!spider.alive,{},120);
assert(g.p.wall,'sword from actual wall');
climbTo(-390);
crossTo(1);
climbTo(-560);
crossTo(-1);
exitShaft('venom',1564,-760);
finishZombie('mid-bell-watch');
gap(1920,2040);
enterShaft(2572,-760);
crossTo(-1,true);
climbTo(-1030);
crossTo(1,true);
climbTo(-1200);
crossTo(-1,true);
climbTo(-1370);
crossTo(1,true);
climbTo(-1540);
crossTo(-1,true);
exitShaft('belfry',2572,-1600,90,42);
gap(2880,3000);
enterShaft(3484,-1600);
crossTo(-1);
climbTo(-1870);
crossTo(1);
climbTo(-2000);
const crownSpider=g.enemies.find(e=>e.id==='crown-spitter');
climbTo(crownSpider.y+18);
tick({left:true,climb:true,laserPressed:true});
until('crown wall laser',()=>crownSpider.hp===1,{},120);
tick({left:true,attackPressed:true});
until('crown wall sword',()=>!crownSpider.alive,{},120);
climbTo(-2040);
crossTo(-1);
climbTo(-2210);
crossTo(1);
climbTo(-2380);
crossTo(-1);
exitShaft('crown',3484,-2640);
finishZombie('summit-watch');
until('exit',()=>g.won,{right:true},240);
assert(g.won,'reachable exit');
assert.equal(g.retries,0);assert.equal(g.p.hp,4);assert.equal(g.p.ammo,4);
assert.equal(crossings.length,16);
assert.equal(capClearance.size,4);
assert(checkpoints.has('crown-upper-rest-checkpoint'));
assert.equal(checkpoints.size,level.checkpoints.length);
assert(maxCameraY-minCameraY>2800,'meaningful vertical camera travel');
for(const event of ['jump','doublejump','wall-contact','laser','sword','venom','ghost-dive','victory']) assert(seen.has(event),`missing real event ${event}`);
for(const id of ['ravine-ghost','high-bell-ghost','venom-instructor','crown-spitter']) {
  for(const state of ['windup','attack','recover']) assert(states.get(id).has(state),`${id} did not demonstrate ${state}`);
}

function replayPrefix(count) {
  const replay=new LevelSimulation(level);
  for(let i=0;i<count;i++) replay.update(inputs[i]);
  return replay;
}
const replay=replayPrefix(inputs.length);
assert(replay.won && replay.retries===0);
assert.deepEqual({x:replay.p.x,y:replay.p.y,hp:replay.p.hp,ammo:replay.p.ammo,time:replay.time},{x:g.p.x,y:g.p.y,hp:g.p.hp,ammo:g.p.ammo,time:g.time},'fresh deterministic replay');

// Branch from input-only prefixes, never from injected wall/position state.
// Preserve the campaign's combat timing while exercising every spike crossing.
export const wallGraceBranches=[];
for(const crossing of crossings) {
  const branch=replayPrefix(crossing.start.tick),sequence=[];
  const direction={right:crossing.to===1,left:crossing.to===-1};
  const step=i=>{
    sequence.push({...i});branch.update(i);
    assert.equal(branch.p.hp,4,'grace crossing must be damage-free');
    assert(!spikes.some(h=>overlap(branch.p.box,h)),'grace crossing must clear spikes');
    assert(!terrain.some(s=>overlap(branch.p.box,s)),'grace crossing stays outside solids');
  };
  assert.equal(branch.p.wall,crossing.from);
  for(let n=0;n<30&&branch.p.wall;n++)step(direction);
  assert.equal(branch.p.wall,0,'actual away input releases contact (including hitstop)');
  for(let n=0;n<3;n++)step(direction);
  step({...direction,jump:true,jumpPressed:true});
  assert(branch.p.kick>0,'delayed press is a wall kick');
  assert.equal(branch.p.airJumps,1,'delayed first jump preserves double jump');
  assert.equal(branch.p.wallSide,0,'grace is consumed');
  for(let n=0;n<180&&branch.p.wall!==crossing.to;n++) {
    step({...direction,jump:true,jumpPressed:crossing.flip&&n===30});
    if(crossing.flip&&n===30)assert(branch.events.includes('doublejump'),'true second jump crosses wide shaft');
  }
  assert.equal(branch.p.wall,crossing.to,'lands on opposite real wall');
  assert.equal(branch.p.wallSide,crossing.to,'fresh opposite contact replaces departure side');
  wallGraceBranches.push({prefix:crossing.start.tick,from:crossing.from,to:crossing.to,flip:crossing.flip,inputs:sequence});
}
console.log('PASS 16 input-only away-delay-wallkick spike crossings, including 5 true double-jump crossings');

// Fresh-prefix branches exercise input timing margin, not injected player state.
for(const cut of capStarts) for(const offset of [-6,0,6]) {
  const branch=replayPrefix(cut.ticks);
  branch.update({right:true,jump:true,jumpPressed:true});
  let landed=false;
  for(let frame=0;frame<240;frame++) {
    branch.update({right:true,jump:true,jumpPressed:frame===cut.flipAt+offset});
    assert.equal(branch.p.hp,4,`${cut.name} cap timing ${offset}`);
    assert(!spikes.some(h=>overlap(branch.p.box,h)),`${cut.name} timing touches spike`);
    if(branch.p.on && branch.p.x>cut.r+60){landed=true;break;}
  }
  assert(landed,`${cut.name} timing branch has no safe landing`);
}
console.log('PASS 12 cap-leap branches, second jump +/-50ms');

const recovery=replayPrefix(recoveryPrefix);
assert.equal(recovery.checkpointId,'primer-terrace-checkpoint');
const returnPoint={...recovery.checkpoint};
for(let fall=1;fall<=4;fall++) {
  let recovered=false;
  for(let n=0;n<900;n++) {
    recovery.update({right:recovery.p.x<1010});
    if(recovery.events.includes('hurt')||recovery.events.includes('retry')){recovered=true;break;}
  }
  assert(recovered,`bounded pit branch ${fall} failed`);
  if(fall<4) {
    assert.equal(recovery.retries,0);assert.equal(recovery.p.hp,4-fall);
    assert.equal(recovery.p.x,returnPoint.x);assert.equal(recovery.p.y,returnPoint.y);
    assert(!recovery.enemies.find(e=>e.id==='first-bell-watch').alive,'nonlethal recovery preserves defeated enemy');
  } else {
    assert.equal(recovery.retries,1);assert.equal(recovery.checkpointId,null);
    assert.equal(recovery.p.x,level.spawn.x);assert.equal(recovery.p.y,level.spawn.y);
    assert.equal(recovery.p.hp,4);assert.equal(recovery.p.ammo,4);
    assert(recovery.enemies.every(e=>e.alive && e.hp===ENEMY_TYPES[e.type].hp),'lethal retry fully resets enemies');
  }
}
const noKick=replayPrefix(climbPrefix);
let hitStrip=false;
for(let n=0;n<600;n++) {
  noKick.update({right:true,climb:true});
  if(noKick.events.includes('hurt')){hitStrip=true;break;}
}
assert(hitStrip && !noKick.won,'negative control: climb-only route must fail at strip');

const approach=new LevelSimulation(level),zombie=approach.enemies[0],zombieStates=new Set();
for(let n=0;n<600;n++) {
  approach.update({right:['patrol','approach'].includes(zombie.state),left:['windup','attack'].includes(zombie.state)});
  zombieStates.add(zombie.state);
  assert.equal(approach.p.hp,4,'readable zombie attack can be evaded');
  if(['windup','attack'].includes(zombie.state)) assert.equal(zombie.pose,'attack');
  if(zombie.state==='recover') break;
}
for(const state of ['approach','windup','attack','recover']) assert(zombieStates.has(state),`zombie attack cycle ${state}`);

const director=new SceneDirector();
director.setLevel(level);
for(const input of inputs) director.update(input,STEP);
assert.equal(director.state,'map');assert(director.completed.has('stage2'));
assert(director.unlocked('stage3'),'exit unlocks stage3 via current director');
console.log('PASS input-only nonlethal checkpoint recovery, lethal full retry, climb-only negative control, zombie attack evasion, stage3 unlock');
console.log(JSON.stringify({result:'PASS',ticks,seconds:g.time,hp:g.p.hp,ammo:g.p.ammo,retries:g.retries,wallCrossings:crossings.length,wideFlipCrossings:crossings.filter(c=>c.flip).length,checkpoints:[...checkpoints],cameraTravel:maxCameraY-minCameraY,capClearance:Object.fromEntries(capClearance),AIStates:Object.fromEntries([...states].map(([id,s])=>[id,[...s]]))},null,2));
