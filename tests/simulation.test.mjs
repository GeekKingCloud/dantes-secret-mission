import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LevelSimulation,canFinish,slashBox,STEP} from '../simulation.mjs';
import {enemyBox,updateEnemy} from '../enemies.mjs';
import {overlap} from '../geometry.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/controller.json',import.meta.url)));
const game=()=>new LevelSimulation(fixture);
const advance=(g,n,input={})=>{for(let k=0;k<n;k++)g.update(input,STEP);};

test('three-hit sword is wide, multi-hit, single damage per swing',()=>{
  const g=game(),e=g.enemies[0];e.x=g.p.x+70;e.face=-1;e.patrol={min:e.x-1,max:e.x+1};
  assert(overlap(slashBox(g.p,1),enemyBox(e)));
  g.update({attackPressed:true});advance(g,10);assert.equal(e.hp,2);
  advance(g,10);assert.equal(e.hp,2,'active frames do not duplicate damage');
  g.update({attackPressed:true});advance(g,30);assert.equal(g.combo,2);assert.equal(e.hp,1);
  g.update({attackPressed:true});advance(g,30);assert.equal(g.combo,3);assert(!e.alive);
});
test('hitstop retains a queued action edge',()=>{
  const g=game();g.hitstop=.04;g.update({laserPressed:true});advance(g,8);
  assert.equal(g.p.ammo,3);assert.equal(g.projectiles.length,1);advance(g,3);assert.equal(g.p.ammo,3);
});
test('finisher requires behind, one HP, correct facing and caps ammo',()=>{
  const g=game(),e=g.enemies[0];e.x=130;e.y=g.p.y;e.face=1;e.hp=1;
  assert(canFinish(g.p,e));g.p.ammo=3;g.update({finishPressed:true});assert(!e.alive);assert.equal(g.p.ammo,4);
  const h=game(),z=h.enemies[0];z.x=130;z.face=-1;z.hp=1;assert(!canFinish(h.p,z));
  z.face=1;z.hp=2;assert(!canFinish(h.p,z));z.hp=1;h.p.face=-1;assert(!canFinish(h.p,z));
  h.p.face=1;h.update({finishPressed:true});assert.equal(h.p.ammo,4);
});
test('wall holding does not block sword or laser',()=>{
  const g=game();g.p.x=731;g.p.y=230;g.p.face=-1;g.p.on=false;
  const e=g.enemies[0];e.x=680;e.y=230;e.hp=3;e.face=1;e.stun=10;
  g.update({attackPressed:true,laserPressed:true});advance(g,15);
  assert.equal(g.p.wall,1);assert.equal(g.p.ammo,3);assert(e.hp<3);assert(g.p.y<250);
});
test('lethal spikes and pit reset current level, not checkpoint or a hardcoded roof',()=>{
  const g=game();g.level.id='stage2';g.checkpoint={x:1150,y:300,face:1};g.checkpointId='cp';g.enemies[0].hp=1;
  g.p.hp=1;g.p.ammo=0;g.p.x=850;g.p.y=650;g.update({});
  assert.equal(g.level.id,'stage2');assert.equal(g.retries,1);assert.equal(g.p.x,fixture.spawn.x);
  assert.equal(g.p.hp,4);assert.equal(g.p.ammo,4);assert.equal(g.checkpointId,null);assert.equal(g.enemies[0].hp,3);
  g.level.hazards.push({id:'lethal',type:'spikes',x:90,y:250,w:30,h:50,damage:4,art:'spikes-top'});
  g.update({});assert.equal(g.retries,2);
});
test('nonlethal pit preserves enemy progress and recovers at checkpoint',()=>{
  const g=game();g.checkpoint={x:1150,y:300,face:-1};g.enemies[0].hp=1;
  g.p.x=800;g.p.y=650;g.update({});assert.equal(g.retries,0);assert.equal(g.p.hp,3);
  assert.equal(g.p.x,1150);assert.equal(g.p.face,-1);assert.equal(g.enemies[0].hp,1);
});
test('all four AI types telegraph then attack and recover',()=>{
  for(const type of ['zombie','bear','ghost','spider']) {
    const g=game(),e=g.enemies.find(e=>e.type===type);g.p.x=e.x-20;g.p.y=e.y;g.p.inv=100;e.face=-1;
    updateEnemy(e,g,STEP);assert.equal(e.state,'windup',type);const y=e.y,x=e.x;
    updateEnemy(e,g,.1);assert.equal(e.state,'windup',`${type} readable windup`);
    for(let n=0;n<95;n++)updateEnemy(e,g,STEP);
    assert(['attack','recover'].includes(e.state),type);
    if(type==='ghost')assert(e.x!==x||e.y!==y);
    if(type==='spider')assert(g.projectiles.some(b=>b.kind==='venom'));
  }
});
test('boss activation, alternating patterns, health and exit gate',()=>{
  const g=game();g.p.x=2350;g.update({});assert(!g.won);
  g.p.x=1790;g.p.inv=100;g.update({});assert(g.bossActive);assert(g.boss.active);
  g.p.x=g.boss.x-70;g.p.y=g.boss.y;
  const states=new Set();for(let n=0;n<650;n++){updateEnemy(g.boss,g,STEP);states.add(g.boss.pose);}
  assert(states.has('windup'));assert(states.has('slash'));assert(states.has('burst'));
  g.hitEnemy(g.boss,24);g.hitstop=0;g.p.x=2350;g.update({});assert(g.won);
});
test('solid geometry stops laser and high-speed dash',()=>{
  const g=game();g.p.x=725;g.p.y=300;g.p.face=1;g.p.on=true;
  g.update({dashPressed:true,laserPressed:true});advance(g,10);assert(g.p.x<=731);assert.equal(g.p.dash,0);
  g.p.face=1;g.update({laserPressed:true});advance(g,5);assert(!g.projectiles.length);
});
