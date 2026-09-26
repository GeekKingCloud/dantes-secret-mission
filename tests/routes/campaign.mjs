// One persistent director, authored route inputs, actual production level loader.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputs as stage1} from './stage1.mjs';
import {inputs as stage2} from './stage2.mjs';
import {inputs as stage3} from './stage3.mjs';
import {SceneDirector} from '../../scenes.mjs';
import {loadLevel} from '../../level-schema.mjs';
import {STEP} from '../../simulation.mjs';
import {overlap} from '../../geometry.mjs';
export const routes={stage1,stage2,stage3};
export const recoveryInputs=[];
export const shots=[];
const d=new SceneDirector(),states=['title'],events=new Set(),levels=[];
const tick=i=>{d.update(i,STEP);if(states.at(-1)!==d.state)states.push(d.state);for(const e of d.events)events.add(e);};
tick({confirmPressed:true});assert.equal(d.state,'home-intro');
for(let n=0;n<700&&d.state==='home-intro';n++)tick({});
assert.equal(d.state,'map');assert(events.has('help')&&events.has('jetpack'));
for(const [id,inputs] of Object.entries(routes)) {
 assert.equal(d.selection,Number(id.slice(-1)));assert(d.unlocked(id));
 tick({confirmPressed:true});assert.equal(d.requestedLevel,id);assert.equal(d.state,'loading');
 const level=await loadLevel(`levels/${id}.json`,async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(`../../${url}`,import.meta.url)))}));
 d.setLevel(level);states.push(d.state);const g=d.game,taken=new Set();let minHP=4,gateDenied=false;const patterns=new Set();
 if(id==='stage2') {
  const recoveryTick=i=>{recoveryInputs.push({...i});tick(i);};
  for(const i of inputs){recoveryTick(i);if(g.checkpointId==='primer-terrace-checkpoint'&&!g.enemies.find(e=>e.id==='first-bell-watch').alive&&g.p.on)break;}
  assert.equal(g.checkpointId,'primer-terrace-checkpoint');
  for(let fall=1;fall<=4;fall++) {
   let returned=false;
   for(let n=0;n<900;n++){recoveryTick({right:g.p.x<1010});if(g.events.includes('hurt')||g.events.includes('retry')){returned=true;break;}}
   assert(returned);assert(d.completed.has('stage1'));assert.equal(g.level.id,'stage2');
   if(fall<4){assert.equal(g.retries,0);assert(!g.enemies.find(e=>e.id==='first-bell-watch').alive);assert.equal(g.checkpointId,'primer-terrace-checkpoint');}
   else {assert.equal(g.retries,1);assert.equal(g.checkpointId,null);assert.equal(g.p.x,level.spawn.x);assert(g.enemies.every(e=>e.alive));}
  }
 }
 const initialRetries=g.retries;
 const capture=(name,index)=>{if(taken.has(name))return;taken.add(name);shots.push({id,name,index,camera:{x:d.camera.x,y:d.camera.y},player:{x:g.p.x,y:g.p.y}});};
 capture('spawn',0);
 for(let index=0;index<inputs.length;index++) {
  tick(inputs[index]);minHP=Math.min(minHP,g.p.hp);
  if(g.p.wall&&g.p.y<level.spawn.y-100)capture('tall-wall',index+1);
  if(id==='stage2'&&g.p.y<-2100)capture('crown-height',index+1);
  if(level.hazards.some(h=>h.type==='spikes'&&Math.abs(h.x-g.p.x)<160&&Math.abs(h.y-g.p.y)<170))capture('spike-decision',index+1);
  if(g.enemies.some(e=>e.type==='ghost'&&e.state==='windup'&&Math.abs(e.x-g.p.x)<260))capture('ghost-telegraph',index+1);
  if(g.bossActive){capture('arena',index+1);if(g.boss.alive&&overlap(g.p.box,level.exit)){assert(!g.won);gateDenied=true;}}
  if(g.boss&&['slash','burst'].includes(g.boss.pose))patterns.add(g.boss.pose);
 }
 assert(g.won);assert.equal(d.state,'map');assert(d.completed.has(id));assert.equal(g.retries,initialRetries);assert.equal(minHP,4);
 if(id==='stage1')assert.equal(g.enemies.filter(e=>!e.alive).length,9);
 if(id==='stage3'){assert(gateDenied);assert.deepEqual([...patterns].sort(),['burst','slash']);assert(g.enemies.every(e=>!e.alive));}
 levels.push({id,frames:inputs.length,hp:g.p.hp,ammo:g.p.ammo,retries:g.retries,defeated:g.enemies.filter(e=>!e.alive).length,gateDenied,patterns:[...patterns]});
}
assert.equal(d.selection,4);tick({confirmPressed:true});assert.equal(d.state,'world2');
export const proof={states,events:[...events],levels,shots,completed:[...d.completed],state:d.state};
console.log('CAMPAIGN PASS',JSON.stringify(proof));
