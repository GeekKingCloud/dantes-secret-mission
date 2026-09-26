import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../renderer.mjs';
import {readFile} from 'node:fs/promises';
import {loadLevel} from '../level-schema.mjs';
test('production level paths resolve the three genuine authored levels',async()=>{
 const counts=[9,8,15];
 for(let n=1;n<=3;n++){
  const level=await loadLevel(`levels/stage${n}.json`,async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(`../${url}`,import.meta.url)))}));
  assert.equal(level.id,`stage${n}`);assert.equal(level.enemies.length,counts[n-1]);
  assert.equal(!!level.boss,n===3);
 }
});
test('side spikes repeat vertically at fixed thickness and face away from attaching wall',()=>{
 const calls=[],ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['draw',...a]);}};
 const r=new Renderer({getContext:()=>ctx},{get:()=>({opaqueBounds:[4,12,28,52],image:'PNG'})});
 const h={art:'spikes-side',x:572,y:30,w:12,h:36};
 r.hazard(h,{walls:[{x:584,y:0,w:64,h:300}]});
 assert(calls.some(c=>c[0]==='scale'&&c[1]===-1));
 const draws=calls.filter(c=>c[0]==='draw');assert.equal(draws.length,2);assert.deepEqual(draws[0].slice(-4),[572,30,12,20]);
 calls.length=0;r.hazard(h,{walls:[{x:508,y:0,w:64,h:300}]});assert(!calls.some(c=>c[0]==='scale'));
});
test('arena backdrop is drawn once behind terrain and aligned above collision floor',()=>{
 const calls=[],ctx={save(){},restore(){},translate(){}};
 const r=new Renderer({getContext:()=>ctx},{});r.image=(...a)=>calls.push(a);r.terrain=()=>{};
 r.stageScenery({time:2,bossActive:true,boss:{alive:true},level:{boss:{y:-500},background:[],surfaces:[],walls:[],hazards:[],decor:[{asset:'boss-arena',x:10000,y:-500}],exit:{requiresBoss:true}}},{x:9500,y:-720});
 assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(0,4),['world','boss-arena',0,-50]);
});
