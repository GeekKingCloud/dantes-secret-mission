import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateLevel} from '../../level-schema.mjs';
import {LevelSimulation, STEP, canFinish} from '../../simulation.mjs';
import {ENEMY_TYPES, enemyBox, isWeak} from '../../enemies.mjs';
import {bodyBox, overlap, solids} from '../../geometry.mjs';
import {SceneDirector, VIEW} from '../../scenes.mjs';

const level=validateLevel(JSON.parse(readFileSync(new URL('../../levels/stage3.json',import.meta.url))));
const physical=solids(level);
function geometryChecks() {
  const worldKeys=new Set(['sky','moon','far-mountains','distant-temples','far-clouds','near-clouds','roof-left','roof-center','roof-right','roof-ridge','wall','wood-beam','eave','stone','spikes-top','spikes-side','lantern','home-interior','table-candle','overworld','boss-arena','portal-animation']);
  for(const key of [...level.surfaces.map(s=>s.art),...level.walls.map(w=>w.art),...level.hazards.filter(h=>h.art).map(h=>h.art),...level.background.map(b=>b.asset),...level.decor.map(d=>d.asset)])assert(worldKeys.has(key),`asset outside contract: ${key}`);
  const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
  const support=(x,y)=>physical.some(s=>x>=s.x&&x<=s.x+s.w&&Math.abs(s.y-y)<.01);
  for(const s of [...physical,...level.hazards])assert(inside(s,level.bounds),`${s.id}: outside bounds`);
  for(let i=0;i<physical.length;i++)for(let j=i+1;j<physical.length;j++)
    assert(!overlap(physical[i],physical[j]),`solid overlap: ${physical[i].id}/${physical[j].id}`);
  for(const s of level.surfaces.filter(s=>s.kind==='solid')) {
    assert(level.walls.some(w=>w.y===s.y+s.h&&s.x>=w.x&&s.x+s.w<=w.x+w.w),`${s.id}: roof/wall alignment`);
  }
  for(const spawn of [level.spawn,...level.checkpoints.map(cp=>cp.spawn)]) {
    const box=bodyBox(spawn,{w:18,h:42});
    assert(support(spawn.x-9,spawn.y)&&support(spawn.x+9,spawn.y),'unsupported spawn');
    assert(![...physical,...level.hazards].some(s=>overlap(box,s)),'unsafe spawn');
    assert(level.enemies.every(e=>Math.hypot(e.x-spawn.x,e.y-spawn.y)>120),'enemy on spawn');
  }
  for(const e of [...level.enemies,level.boss]) {
    assert(!physical.some(s=>overlap(enemyBox(e),s)),`${e.id}: initial solid overlap`);
    if(['zombie','bear','masked-mutant-boss'].includes(e.type)) {
      const half=ENEMY_TYPES[e.type].w/2;
      const min=e.arena?e.arena.x+half:e.patrol.min;
      const max=e.arena?e.arena.x+e.arena.w-half:e.patrol.max;
      for(let x=min-half;x<=max+half;x++)assert(support(x,e.y),`${e.id}: unsupported patrol at ${x}`);
      const lane={x:min-half,y:e.y-ENEMY_TYPES[e.type].h,w:max-min+2*half,h:ENEMY_TYPES[e.type].h};
      assert(!level.hazards.some(h=>overlap(lane,h)),`${e.id}: patrol crosses hazard`);
    } else if(e.type==='spider') {
      const w=level.walls.find(w=>w.id===e.wallId);
      assert(e.x+ENEMY_TYPES.spider.w/2<=w.x||e.x-ENEMY_TYPES.spider.w/2>=w.x+w.w,'spider embedded');
      assert(e.patrol.min-ENEMY_TYPES.spider.h>=w.y&&e.patrol.max<=w.y+w.h,'spider patrol outside wall');
    }
  }
  assert.deepEqual(new Set(level.enemies.map(e=>e.type)),new Set(['zombie','bear','ghost','spider']));
  assert(level.exit.requiresBoss&&inside(level.boss.arena,level.camera));
  assert.equal(level.boss.y,level.boss.arena.y+level.boss.arena.h);
  const clouds=level.background.filter(b=>b.asset.endsWith('clouds'));
  assert.equal(clouds.length,2);assert(clouds.every(c=>c.driftX!==0));assert.notEqual(clouds[0].factorX,clouds[1].factorX);
  assert.deepEqual(new Set(level.background.map(b=>b.asset)),new Set(['sky','moon','far-mountains','distant-temples','far-clouds','near-clouds']));
  assert.deepEqual(VIEW,{w:640,h:360});
  console.log('PASS geometry: supported patrols/spawns, separate aligned roof/wall solids, hazards, roster, camera and six layers');
}
geometryChecks();

// The only game mutations below are public constructor/setLevel and update(input).
// Observations steer button presses; no actor, checkpoint, health or ammo setters.
const director=new SceneDirector();director.setLevel(level);
const g=director.game;
let frames=0,beat='initial',minY=g.p.y,maxY=g.p.y;
let cameraMinY=director.camera.y,cameraMaxY=director.camera.y;
export const inputs=[];
const checkpointFrames=new Map(),fightFrames=new Map(),rearExecutions=[];
const events=new Map(),poses=new Set(),checkpoints=new Set(),enemyStates=new Map(),milestones=[];
function snapshot() {
  return {beat,frames,seconds:+(frames*STEP).toFixed(2),p:{x:g.p.x,y:g.p.y,hp:g.p.hp,ammo:g.p.ammo,on:g.p.on,wall:g.p.wall},enemies:g.enemies.filter(e=>e.alive&&Math.abs(e.x-g.p.x)<350).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,state:e.state,face:e.face}))};
}
function tick(input={}) {
  assert(frames++<36000,`global 300-second budget: ${JSON.stringify(snapshot())}`);
  inputs.push({...input});
  director.update(input,STEP);
  const camera=director.camera,bounds=level.camera;
  assert(camera.x>=bounds.x&&camera.x<=bounds.x+bounds.w-VIEW.w&&camera.y>=bounds.y&&camera.y<=bounds.y+bounds.h-VIEW.h,'camera outside authored bounds');
  cameraMinY=Math.min(cameraMinY,camera.y);cameraMaxY=Math.max(cameraMaxY,camera.y);
  minY=Math.min(minY,g.p.y);maxY=Math.max(maxY,g.p.y);poses.add(g.p.pose);
  for(const event of g.events)events.set(event,(events.get(event)||0)+1);
  if(g.events.includes('hurt'))console.log('DAMAGE',JSON.stringify(snapshot()));
  if(g.checkpointId){checkpoints.add(g.checkpointId);if(!checkpointFrames.has(g.checkpointId))checkpointFrames.set(g.checkpointId,frames);}
  for(const e of g.enemies) {
    if(!enemyStates.has(e.id))enemyStates.set(e.id,new Set());
    enemyStates.get(e.id).add(e.pose);
    if(e.alive&&e.active)assert(!physical.some(s=>overlap(enemyBox(e),s)),`${e.id}: live solid overlap; ${JSON.stringify(snapshot())}`);
  }
  assert.equal(g.retries,0,`unexpected lethal retry: ${JSON.stringify(snapshot())}`);
}
function until(label,predicate,input,max=1200) {
  beat=label;
  for(let n=0;n<max;n++) {if(predicate())return;tick(typeof input==='function'?input(n):input);}
  console.error('OBSTRUCTION',JSON.stringify(snapshot()));
  assert.fail(`${label}: bounded ${max}-step limit`);
}
function settle() {until('settle',()=>g.p.on&&Math.abs(g.p.vx)<1,{},180);}
function move(x) {
  until(`move to ${x}`,()=>Math.abs(g.p.x-x)<3,()=>({right:g.p.x<x,left:g.p.x>x}),1800);
  settle();
}
function gap(edge,landing,y) {
  move(edge-30);
  tick({right:true,jump:true,jumpPressed:true});
  until(`gap ${edge} to ${landing}`,()=>g.p.wall===1||(g.p.on&&g.p.x>=landing&&Math.abs(g.p.y-y)<1),
    n=>({right:g.p.x<landing+48,jump:true,jumpPressed:n===32}),300);
  if(g.p.wall===1)tower(landing,y);
  settle();
}
function tower(x,y) {
  until(`contact tower ${x}`,()=>g.p.wall===1,{right:true,climb:true},900);
  until(`climb tower ${x} to ${y}`,()=>g.p.y<=y+26,n=>({right:true,climb:true,attackPressed:n%12===0}),1200);
  tick({right:true,jump:true,jumpPressed:true});
  until(`crest tower ${x}`,()=>g.p.on&&g.p.x>x+20&&Math.abs(g.p.y-y)<1,
    n=>({right:true,jump:true,jumpPressed:n===30}),300);
  settle();
}
function spike(x,end) {
  move(x-42);tick({right:true,jump:true,jumpPressed:true});
  until(`spikes ${x}`,()=>g.p.on&&g.p.x>end+24,{right:true,jump:true},180);settle();
}
function fight(id,{finish=true,laser=false}={}) {
  const e=g.enemies.find(e=>e.id===id);assert(e);
  fightFrames.set(id,frames);
  beat=`fight ${id}`;
  if(e.type==='ghost') {
    move(e.homeX-160);
    until(`anti-air ${id}`,()=>!e.alive,n=>({
      right:e.x>g.p.x&&g.p.face<0,left:e.x<g.p.x&&g.p.face>0,
      jump:true,jumpPressed:g.p.on&&e.state==='attack'&&e.timer<.36,
      attackPressed:n%10===0,laserPressed:laser&&n===0,
    }),1800);
  } else {
    until(`approach ${id}`,()=>Math.abs(e.x-g.p.x)<80,()=>({right:e.x>g.p.x,left:e.x<g.p.x}),600);
    settle();
    until(`weaken ${id}`,()=>!e.alive||(finish&&isWeak(e)),n=>{
      const i={attackPressed:n%12===0,laserPressed:laser&&n===0};
      if(e.type==='masked-mutant-boss'){
        const dx=e.x-g.p.x;i.right=dx>0;i.left=dx<0;
        if(Math.abs(dx)<70){i.right=false;i.left=false;}
        if(g.p.face!==Math.sign(dx)){i.right=dx>0;i.left=dx<0;}
        if(g.p.on&&!g.p.dashCD&&((e.state==='windup'&&e.timer<.14)||e.state==='attack'))i.dashPressed=true;
      }
      return i;
    },1200);
    if(e.alive) {
      until(`thaw ${id}`,()=>g.hitstop===0,{},30);
      assert(e.weak&&isWeak(e),'weakened actor flag precedes finisher');
      const ammo=g.p.ammo;
      if(!canFinish(g.p,e,level)) {
        const hp=e.hp;tick({finishPressed:true});assert.equal(e.hp,hp,'front execute did damage');
        const playerHP=g.p.hp;
        tick({right:g.p.x<e.x,left:g.p.x>e.x,dashPressed:true});
        assert(g.p.dash>0,'ground dash starts immediately after hitstop');
        until(`dash through ${id}`,()=>!g.p.dash,{},90);
        assert.equal(g.p.hp,playerHP,'safe grounded crossing');
        assert(g.p.box.x>enemyBox(e).x+enemyBox(e).w||g.p.box.x+g.p.box.w<enemyBox(e).x,'dash fully clears body');
        tick({right:e.x>g.p.x,left:e.x<g.p.x});
        until(`rear window ${id}`,()=>canFinish(g.p,e,level),()=>({right:e.x>g.p.x,left:e.x<g.p.x}),90);
      }
      tick({finishPressed:true});
      until(`execute ${id}`,()=>!e.alive,{},30);
      rearExecutions.push(id);
      assert.equal(g.p.ammo,Math.min(4,ammo+1),'exact capped refund');
      tick({finishPressed:true});assert.equal(g.p.ammo,Math.min(4,ammo+1),'duplicate refund');
    }
  }
  settle();
  milestones.push({id,seconds:+(frames*STEP).toFixed(2),hp:g.p.hp,ammo:g.p.ammo});
  console.log('BEAT',JSON.stringify(milestones.at(-1)));
}

fight('gate-scout');
gap(760,880,260);move(960);fight('court-warden',{laser:true});
tower(1560,-160);move(1660);fight('bell-scout');
gap(2020,2140,-200);fight('first-spirit',{finish:false});
gap(2780,2900,-160);spike(3170,3226);fight('ridge-scout');
gap(3500,3620,0);move(3700);fight('lower-warden');
tower(4260,-500);assert(!g.enemies.find(e=>e.id==='venom-sentry').alive,'wall sword defeats sentry');move(4370);fight('tower-warden');
gap(4800,4940,-540);fight('cloud-spirit',{finish:false});
gap(5460,5580,-400);spike(5770,5826);fight('eave-scout');
tower(6100,-900);assert(!g.enemies.find(e=>e.id==='moon-sentry').alive,'wall sword defeats sentry');move(6210);
gap(6660,6800,-900);fight('summit-warden');
gap(7420,7540,-720);move(7565);fight('descent-scout');
gap(7920,8040,-540);fight('last-spirit',{finish:false});
gap(8460,8580,-360);fight('last-warden');
gap(9160,9280,-500);move(9420);
console.log('ARRIVED',JSON.stringify(snapshot()));

// The final exit is deliberately accessible as space, but not as victory.
// Run to it with the living boss, then come back to fight: no forced death flag.
move(9700);assert(g.bossActive);assert.equal(director.state,'boss');
until('read boss slash',()=>enemyStates.get(g.boss.id).has('slash'),{},240);
until('read boss burst',()=>enemyStates.get(g.boss.id).has('burst'),{},360);
until('burst recovery',()=>g.boss.state==='recover',{},120);
until('cross living boss to locked exit',()=>overlap(g.p.box,level.exit),()=>({right:true,dashPressed:g.p.on&&g.boss.x-g.p.x>0&&g.boss.x-g.p.x<105}),900);
settle();assert(overlap(g.p.box,level.exit));assert(g.boss.alive);assert(!g.won);assert.equal(director.state,'boss');
console.log('PASS exit overlaps player but refuses victory while boss lives');
fight('masked-shadow',{finish:false,laser:true});
const bossDefeatFrame=frames;
assert(!g.boss.alive);until('enter unlocked exit',()=>g.won,{right:true},900);
assert(g.won);assert(director.completed.has('stage3'));assert.equal(director.state,'map');
director.update({confirmPressed:true},STEP);assert.equal(director.state,'world2');
assert(g.enemies.every(e=>!e.alive),'full route legitimately defeated roster');
assert.equal(checkpoints.size,level.checkpoints.length);
assert(poses.has('wall-climb')&&poses.has('wall-jump')&&poses.has('frontflip')&&poses.has('finisher'));
assert(minY<-900&&maxY>=300,'mixed elevation route');
assert.equal(g.p.hp,4,'damage-free feasible route, not unavoidable attrition');
assert(cameraMaxY-cameraMinY>1100,'real vertical camera tracking');
assert(rearExecutions.includes('court-warden')&&rearExecutions.includes('gate-scout'));
for(const id of ['first-spirit','cloud-spirit','last-spirit'])assert(enemyStates.get(id).has('dive-windup')&&enemyStates.get(id).has('dive'));
for(const id of ['venom-sentry','moon-sentry'])assert(enemyStates.get(id).has('venom-windup')&&enemyStates.get(id).has('spit'));
console.log('PASS full input-only route',JSON.stringify({frames,seconds:+(frames*STEP).toFixed(2),hp:g.p.hp,ammo:g.p.ammo,retries:g.retries,minY,maxY,cameraMinY,cameraMaxY,rearExecutions,checkpoints:[...checkpoints],events:Object.fromEntries(events),poses:[...poses],world2:director.state}));

// Reconstruct the late checkpoint from a second fresh game via the same inputs.
// Falling in the entrance ravine is intentional here, never a completion shortcut.
const recovery=new LevelSimulation(level);
for(const input of inputs.slice(0,bossDefeatFrame))recovery.update(input,STEP);
assert.equal(recovery.checkpointId,'mask-rest');
assert(recovery.enemies.every(e=>!e.alive));assert(recovery.bossActive);assert(!recovery.won);
assert.equal(recovery.p.ammo,3);
for(let fall=1;fall<=4;fall++) {
  const hp=recovery.p.hp;let recovered=false;
  for(let n=0;n<600;n++) {
    recovery.update({left:recovery.p.x>9220},STEP);
    if(recovery.p.hp<hp||recovery.retries){recovered=true;break;}
  }
  assert(recovered,`bounded recovery fall ${fall} failed`);
  if(fall<4) {
    assert.equal(recovery.p.hp,4-fall);assert.equal(recovery.p.x,9420);assert.equal(recovery.p.y,-500);
    assert.equal(recovery.checkpointId,'mask-rest');assert.equal(recovery.p.ammo,3);
    assert(recovery.enemies.every(e=>!e.alive));assert(recovery.bossActive);
  }
}
assert.equal(recovery.retries,1);assert.equal(recovery.p.hp,4);assert.equal(recovery.p.ammo,4);
assert.equal(recovery.p.x,level.spawn.x);assert.equal(recovery.p.y,level.spawn.y);
assert.equal(recovery.checkpointId,null);assert(!recovery.bossActive);assert(!recovery.won);
assert(recovery.enemies.every(e=>e.alive&&e.hp===e.maxHp));
console.log('PASS input-only recovery: three nonlethal checkpoint returns; fourth fall resets entire level, roster, boss, ammo and checkpoint');

// Main-route sword interrupts are deliberate. Separately let each grounded
// archetype complete its telegraph/strike/recovery on the authored rooftop.
for(const id of ['gate-scout','court-warden']) {
  const probe=new LevelSimulation(level);
  for(const input of inputs.slice(0,fightFrames.get(id)))probe.update(input,STEP);
  const e=probe.enemies.find(e=>e.id===id),t=ENEMY_TYPES[e.type],states=new Set(),shown=new Set();
  let retreat=false,complete=false;
  const initialHP=probe.p.hp;
  for(let n=0;n<1800;n++) {
    if(e.state==='windup')retreat=true;
    const side=Math.sign(probe.p.x-e.x)||-1;
    const move=retreat?(Math.abs(probe.p.x-e.x)<t.reach+80?side:0):-side;
    probe.update({left:move<0,right:move>0},STEP);
    states.add(e.state);shown.add(e.pose);
    if(states.has('attack')&&e.state==='recover'){complete=true;break;}
  }
  assert(complete,`${id}: bounded AI cycle failed`);
  assert(states.has('approach')&&states.has('windup')&&states.has('attack')&&states.has('recover'));
  assert(shown.has(e.type==='bear'?'slash':'attack'));
  assert.equal(probe.p.hp,initialHP,`${id}: ordinary retreat escapes telegraph`);
  console.log('PASS telegraph and safe retreat',JSON.stringify({id,states:[...states],poses:[...shown],hp:probe.p.hp}));
}
console.log('AI poses',JSON.stringify(Object.fromEntries([...enemyStates].map(([id,states])=>[id,[...states]]))));
console.log('CHECKPOINT seconds',JSON.stringify(Object.fromEntries([...checkpointFrames].map(([id,n])=>[id,+(n*STEP).toFixed(2)]))));
