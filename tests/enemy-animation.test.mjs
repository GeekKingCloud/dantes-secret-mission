import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AssetLibrary,validateAtlasManifest} from '../asset-loader.mjs';
import {missingCharacterActions} from '../character-contract.mjs';
import {enemyVisual} from '../enemy-animation.mjs';
import {createEnemy,updateEnemy,enemyBox} from '../enemies.mjs';
import {LevelSimulation,STEP,canFinish} from '../simulation.mjs';
const m=JSON.parse(await readFile(new URL('../assets/characters/manifest.json',import.meta.url)));
const level=JSON.parse(await readFile(new URL('./fixtures/controller.json',import.meta.url)));
test('canonical inventory has every required actor/action and native venom, without aliases',()=>{
 validateAtlasManifest(m);assert.deepEqual(missingCharacterActions(m.assets),[]);assert.equal(Object.keys(m.assets).length,8);
 const enemies=Object.entries(m.assets).filter(([,a])=>a.combatPhases);assert.equal(enemies.length,5);
 assert.equal(enemies.reduce((n,[,a])=>n+Object.keys(a.animations).length,0),29);
 assert.equal(enemies.reduce((n,[,a])=>n+a.frameCount,0),201);
 const v=m.assets.spider.projectileVisual;assert.deepEqual(v.anchor,[6,6]);assert.equal(v.frameWidth,12);assert.deepEqual(v.animations.fly.frames,[0,1,2]);
});
test('all eight phase tracks select exact native ranges by state elapsed, including recovery and enrage',()=>{
 let tracks=0;for(const [type,a] of Object.entries(m.assets))for(const [track,phases] of Object.entries(a.combatPhases||{})){
  tracks++;for(const [state,phase] of [['windup','windup'],['attack','active'],['recover','recovery']]){
   const s=phases[phase],e={alive:true,stun:0,state,attackTrack:track,stateDuration:s.durationMs/1000,timer:s.durationMs/1000,pose:Object.keys(a.animations)[0]};
   assert.equal(enemyVisual(e,a).frame,s.frames[0],`${type}/${track}/${phase} start`);
   const seen=new Set();for(let n=0;n<s.frames.length;n++){e.timer=e.stateDuration*(1-(n+.1)/s.frames.length);seen.add(enemyVisual(e,a).frame);}
   assert.deepEqual([...seen],[...new Set(s.frames)]);e.timer=0;assert.equal(enemyVisual(e,a).frame,s.frames.at(-1));
  }
 }
 assert.equal(tracks,8);
});
test('spider contact and emitted mouth agree on both wall sides; patrol direction never flips mouth into wall',()=>{
 const a=m.assets.spider;
 for(const face of [-1,1]){
  const wall={id:'wall',x:300,y:0,w:60,h:600,climbable:true,art:'wall'},l={...level,walls:[wall]};
  const e=createEnemy({id:'spider',type:'spider',wallId:'wall',x:face<0?284:374,y:150,face,patrol:{min:120,max:180}},l);
  const plane=face<0?300:360;assert.equal(e.x+face*(a.wallContact[0]-a.anchor[0]),plane);
  const g={level:l,p:{x:e.x+face*100,y:e.y,box:{x:-1000,y:0,w:1,h:1}},events:[],projectiles:[],damagePlayer(){throw Error('spider melee');}};
  for(let n=0;n<150&&!g.projectiles.length;n++)updateEnemy(e,g,STEP);
  assert.equal(e.face,face);const b=g.projectiles[0];assert(b);
  assert.equal(b.x,e.x+face*(a.mouth[0]-a.anchor[0]));assert.equal(b.y,e.y+a.mouth[1]-a.anchor[1]);
  assert.deepEqual(enemyBox(e),{x:e.x-14,y:e.y-28,w:28,h:28});
 }
});
test('defeat displays all native frames after mechanical death, with no attack or repeat finish',()=>{
 const g=new LevelSimulation(level),e=g.enemies[0],a=m.assets[e.type];g.hitEnemy(e,e.hp);const hp=g.p.hp,ammo=g.p.ammo;
 assert(!canFinish(g.p,e,g.level));const seen=new Set();
 for(let n=0;n<120;n++){seen.add(enemyVisual(e,a).frame);updateEnemy(e,g,STEP);}
 assert.deepEqual([...seen],a.animations.defeat.frames);assert.equal(g.p.hp,hp);assert.equal(g.p.ammo,ammo);assert(!enemyVisual({...e,defeatTime:1.1},a).visible);
});
