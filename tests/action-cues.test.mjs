import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LevelSimulation,canFinish} from '../simulation.mjs';
import {Renderer,layerOffset} from '../renderer.mjs';
import {AssetLibrary} from '../asset-loader.mjs';
import {combatFixture,bearSequence} from './fixtures/labs.mjs';
const base=JSON.parse(readFileSync(new URL('./fixtures/controller.json',import.meta.url)));
const hero=JSON.parse(readFileSync(new URL('../assets/characters/hero-manifest.json',import.meta.url)));
function sequence({spend=true,queued=true}={}) {
  const g=new LevelSimulation(combatFixture(base)),schedule=new Map(bearSequence);
  if(!spend)schedule.delete(0);
  if(queued)schedule.set(130,{left:true,attackPressed:true});
  for(let n=0;n<131;n++)g.update(schedule.get(n)||{});
  assert(canFinish(g.p,g.enemies[0],g.level));
  if(queued){assert(g.attackTime>0);g.update({attackPressed:true});assert(g.attackQueue>0);}
  g.update({finishPressed:true});return g;
}
function rig(){
  const calls=[],rects=[],ctx={save(){},restore(){},fillRect(...args){rects.push(args);},strokeRect(...args){rects.push(args);}};
  const assets=new AssetLibrary();assets.groups.set('characters',new Map(Object.entries(hero.assets)));
  assets.draw=(c,group,id,pose,x,y,o)=>{const a=assets.get(group,id,pose),anim=a.animations[pose];calls.push({pose,...o,frame:anim.frames[Math.min(anim.frames.length-1,Math.floor(o.time*anim.fps))]});};
  return {r:new Renderer({getContext:()=>ctx},assets),calls,rects,ctx};
}
test('laser+sword dispatch is visible immediately, sword damage clock and buffering continue',()=>{
  const g=new LevelSimulation(combatFixture(base));g.update({laserPressed:true,attackPressed:true});
  assert.equal(g.p.pose,'laser');assert(g.attackTime>0);assert.equal(g.p.ammo,3);assert(g.events.includes('laser')&&g.events.includes('sword'));
  const {r,calls}=rig(),frames=new Set();
  for(let n=0;n<19;n++){assert.equal(g.p.pose,'laser');r.player(g);frames.add(calls.at(-1).frame);g.update(n===10?{attackPressed:true}:{});}
  assert(frames.size>=3,'authored laser frames advance on laser clock, not sword progress');
  for(let n=0;n<25;n++)g.update({});assert.equal(g.swing,2,'early queued sword still chains');
});
test('real rear execute survives already-queued sword on same tick; gain pulse only below cap',()=>{
  for(const spend of [true,false]){
    const g=sequence({spend});assert.equal(g.p.pose,'finisher');assert(g.attackTime>0,'queued attack is not delayed');assert(!g.enemies[0].alive);assert.equal(g.p.ammo,4);
    assert.equal(g.chargeTime>0,spend);assert.equal(g.chargePip,spend?3:-1);
    const {r,calls}=rig(),frames=new Set();let visible=0;
    for(let n=0;n<38;n++){if(g.p.pose==='finisher'){visible++;r.player(g);frames.add(calls.at(-1).frame);}g.update({});}
    assert(visible>=30);assert(frames.size>=3,'authored execution timeline actually advances');
    for(let n=0;n<30;n++)g.update({});assert.equal(g.chargeTime,0);g.update({finishPressed:true});assert.equal(g.chargeTime,0);
  }
});
test('air and neutral wall laser retain authored cue without immobilizing climb or jump',()=>{
  const g=new LevelSimulation({...base,enemies:[],hazards:[],walls:[{id:'cue-wall',x:200,y:0,w:20,h:300,climbable:true,art:'wall'}],spawn:{x:150,y:300,face:1}});
  g.update({right:true,jump:true,jumpPressed:true,laserPressed:true,attackPressed:true});assert.equal(g.p.pose,'laser');assert(!g.p.on);
  for(let n=0;n<80&&!g.p.wall;n++)g.update({right:true,jump:true});assert.equal(g.p.wall,1);
  for(let n=0;n<50;n++)g.update({});const y=g.p.y;
  g.update({laserPressed:true,attackPressed:true});assert.equal(g.p.pose,'laser');assert.equal(g.p.y,y);
  g.update({climb:true});assert(g.p.y<y);assert.equal(g.p.pose,'laser');
  g.update({jump:true,jumpPressed:true});assert.equal(g.p.wall,0);assert(g.p.kick>0);
});
test('dash and hurt cancel cues rather than replaying stale action after cancellation',()=>{
  const dash=new LevelSimulation(combatFixture(base));dash.update({laserPressed:true,attackPressed:true});dash.update({dashPressed:true});
  assert.equal(dash.p.pose,'dash');assert.equal(dash.actionTime,0);assert.equal(dash.attackTime,0);
  const hurt=new LevelSimulation(combatFixture(base));hurt.update({laserPressed:true});assert(hurt.damagePlayer(1,hurt.p.x+30));
  assert.equal(hurt.actionTime,0);assert.equal(hurt.p.pose,'hurt');for(let n=0;n<30;n++)hurt.update({});assert.notEqual(hurt.p.pose,'laser');
});
test('wall and air executions reached by real inputs retain authored cues',()=>{
  const wall=new LevelSimulation({...base,spawn:{x:191,y:270,face:-1},boss:null,exit:{...base.exit,requiresBoss:false},hazards:[],
    walls:[{id:'cue-wall',x:200,y:0,w:20,h:300,climbable:true,art:'wall'}],
    surfaces:[...base.surfaces,{id:'target-ledge',x:90,y:270,w:75,h:16,kind:'oneWay',art:'stone'}],
    enemies:[{id:'rear-target',type:'zombie',x:135,y:270,face:-1,patrol:{min:110,max:150}}]});
  wall.update({laserPressed:true});
  for(let n=0;n<25&&wall.enemies[0].hp>1;n++)wall.update({});
  assert(canFinish(wall.p,wall.enemies[0],wall.level));
  for(let n=0;n<6;n++)wall.update({});
  wall.update({finishPressed:true,attackPressed:true});assert.equal(wall.p.wall,1);assert.equal(wall.p.pose,'finisher');assert(wall.chargeTime>0);
  const air=new LevelSimulation(combatFixture(base)),schedule=new Map(bearSequence);schedule.delete(131);
  for(let n=0;n<131;n++)air.update(schedule.get(n)||{});
  air.update({jump:true,jumpPressed:true,finishPressed:true,attackPressed:true});
  assert(!air.p.on);assert.equal(air.p.pose,'finisher');assert(!air.enemies[0].alive);
});
test('gain glow is steady independent of invulnerability blink; only gained HUD pip pulses',()=>{
  for(const spend of [true,false]){
    const g=sequence({spend}),{r,calls,rects,ctx}=rig();r.player(g);
    assert.equal(ctx.shadowColor,spend?'#79ffb2':undefined);
    if(spend)assert.equal(calls.at(-1).alpha,1);
    rects.length=0;r.image=()=>{};r.text=()=>{};r.hud(g);
    assert.deepEqual(rects,spend?[[78,50,18,18]]:[]);
  }
});
test('only surviving drifting upper clouds are drawn at every stage camera height',()=>{
  for(const id of ['stage1','stage2','stage3']){
    const level=JSON.parse(readFileSync(new URL(`../levels/${id}.json`,import.meta.url)));
    const clouds=level.background.filter(b=>b.asset.endsWith('clouds'));
    assert.deepEqual(clouds.map(b=>b.asset),['near-clouds']);const layer=clouds[0];assert(layer.driftX!==0);
    for(const y of [0,level.camera.y,level.camera.y+level.camera.h-360])assert(layerOffset(layer,{x:100,y},2,640).y<=-35);
    assert.notEqual(layerOffset(layer,{x:100,y:0},0,640).x,layerOffset(layer,{x:100,y:0},2,640).x);
  }
});
