import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AssetLibrary,validateAtlasManifest} from '../asset-loader.mjs';
import {Renderer} from '../renderer.mjs';
import {COMBO} from '../simulation.mjs';
import {introBlocking,SceneDirector} from '../scenes.mjs';
import {missingCharacterActions} from '../character-contract.mjs';
const m=JSON.parse(await readFile(new URL('../assets/characters/hero-manifest.json',import.meta.url)));
const hero=m.assets.kagebot;
function rig(){const lib=new AssetLibrary();lib.groups.set('characters',new Map(Object.entries(m.assets)));const calls=[];lib.draw=(ctx,group,id,pose,x,y,o)=>{const a=lib.get(group,id,pose),anim=a.animations[pose],n=Math.floor(o.time*anim.fps);calls.push({id,pose,x,y,...o,frame:anim.frames[anim.loop?n%anim.frames.length:Math.min(n,anim.frames.length-1)]});};return {r:new Renderer({getContext:()=>({})},lib),lib,calls};}
test('preserved provisional hero fixture; incomplete inventories still reject absent enemies',()=>{
 validateAtlasManifest(m);assert.deepEqual(Object.keys(m.assets),['kagebot','robot-butler','jetpack-drone']);
 assert.equal(Object.keys(hero.animations).length,18);assert.equal(hero.frameMetadata.length,72);assert.deepEqual(hero.anchor,[64,80]);assert.equal(hero.frameWidth,192);assert.equal(hero.frameHeight,96);
 assert.equal(m.assets['robot-butler'].frameMetadata.length,5);assert.equal(m.assets['jetpack-drone'].frameMetadata.length,5);
 assert(missingCharacterActions(m.assets).includes('ghost/dive'));assert.throws(()=>rig().lib.requireCharacters(),/Missing accepted character animations/);
 assert.throws(()=>rig().lib.get('characters','kagebot','missing-action'),/Missing PNG animation/);
});
test('all three native sword timelines follow unchanged startup/active/recovery and mirror around fixed root',()=>{
 const {r,calls}=rig();
 for(let combo=1;combo<=3;combo++){
  const a=COMBO[combo-1],anim=hero.animations[`sword-${combo}`],total=a.windup+a.active+a.recovery;
  assert.equal(anim.frames.length,20);assert.equal(new Set(anim.frames).size,7);assert(Math.abs(anim.frames.length/anim.fps-total)<1e-9);
  for(const [time,physical] of [[.001,0],[a.windup+.0001,1],[a.windup+a.active+.0001,6],[total-.0001,6]]){
   for(const face of [1,-1]){
    r.player({p:{pose:`sword-${combo}`,x:100,y:300,face,wall:0},time,attackTime:time,combo,projectiles:[]});
    const c=calls.at(-1);assert.equal(c.frame,anim.frames[0]+physical);assert.equal(c.x,100);assert.equal(c.y,300);assert.equal(c.face,face);
   }
  }
 }
});
test('wall-grip raster bounds align with fixed body contact without atlas rescaling',()=>{
 const {r,calls}=rig();
 for(const pose of ['wall-hold','wall-climb'])for(const wall of [-1,1]){
  r.clocks.clear();
  for(let n=0;n<50;n++){
   r.player({p:{pose,x:100,y:300,face:wall,wall},time:n/120,attackTime:0,projectiles:[]});
   const c=calls.at(-1),right=hero.frameMetadata[c.frame].bounds[2]-1;
   assert.equal(c.x+wall*(right-hero.anchor[0]),100+wall*9);assert.equal(c.y,300);assert.equal(c.scale,undefined);
  }
 }
});
test('opening native shared grip remains attached; pause/skip preserve ordered scene progression',()=>{
 for(let n=498;n<696;n++){
  const b=introBlocking(n/120);assert.equal(b.hero.pose,'drone-depart');
  assert(Math.abs(b.hero.x+b.hand[0]-b.drone.x-b.grab[0])<1e-8);
  assert(Math.abs(b.hero.y+b.hand[1]-b.drone.y-b.grab[1])<1e-8);
 }
 const d=new SceneDirector();d.update({confirmPressed:true},1/120);d.update({pausePressed:true},1/120);const t=d.time;d.update({},1/120);assert.equal(d.time,t);
 d.update({confirmPressed:true},1/120);d.update({confirmPressed:true},1/120);assert.equal(d.state,'map');assert.equal(d.selection,1);
});
