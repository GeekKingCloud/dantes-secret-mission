// Input-only branches from the accepted authored routes; never actor state injection.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inputs as route1} from './stage1.mjs';
import {inputs as route3} from './stage3.mjs';
import {LevelSimulation} from '../../simulation.mjs';
import {enemyBox} from '../../enemies.mjs';
import {overlap,solids} from '../../geometry.mjs';
const level1=JSON.parse(await readFile(new URL('../../levels/stage1.json',import.meta.url)));
const level3=JSON.parse(await readFile(new URL('../../levels/stage3.json',import.meta.url)));
const prefix=(level,inputs,stop)=>{const g=new LevelSimulation(level);for(const i of inputs){if(stop(g))break;g.update(i);}return g;};
let firstOverlap=null,maxDives=0,lateHits=0;
for(const threshold of [.1,.18,.26,.34])for(const offset of [-45,0,45]) {
 const g=prefix(level1,route1,g=>g.enemies[4].state==='windup'),e=g.enemies[4];
 const target=g.p.x+offset;let swings=0,dives=0,oldState=e.state;
 for(let n=0;n<1800&&g.retries===0;n++) {
  const i={jump:true};
  if(Math.abs(g.p.x-target)>3){i.right=g.p.x<target;i.left=g.p.x>target;}
  if(e.state==='attack'&&e.timer<threshold&&g.p.on)i.jumpPressed=true;
  if(e.state==='attack'&&e.timer<threshold&&swings<2&&!g.attackTime&&Math.abs(g.p.y-e.y)<48){i.attackPressed=true;swings++;}
  if(i.attackPressed){i.right=e.x>g.p.x;i.left=e.x<g.p.x;}
  const hp=e.hp;g.update(i);if(e.hp<hp)lateHits++;
  if(e.state==='attack'&&oldState!=='attack')dives++;oldState=e.state;
  const solid=solids(level1).find(s=>overlap(enemyBox(e),s));
  if(e.alive&&solid&&!firstOverlap)firstOverlap={threshold,offset,n,dives,swings,hp:e.hp,x:e.x,y:e.y,solid:solid.id};
 }
 maxDives=Math.max(maxDives,dives);
}
const bossGame=prefix(level3,route3,g=>g.bossActive),boss=bossGame.boss;
const patterns=new Set(),pressurePatterns=new Set();let hits=0,damage=0;
for(let n=0;n<2000&&boss.alive&&bossGame.retries===0;n++) {
 const dx=boss.x-bossGame.p.x,i={};
 if(Math.abs(dx)>74||bossGame.p.face!==Math.sign(dx)){i.right=dx>0;i.left=dx<0;}
 if(Math.abs(dx)<105&&n%12===0)i.attackPressed=true;
 const hp=boss.hp,playerHP=bossGame.p.hp;bossGame.update(i);if(boss.hp<hp)hits++;if(bossGame.p.hp<playerHP)damage++;
 if(['slash','burst'].includes(boss.pose))patterns.add(boss.pose);
 if(hits>0&&['slash','burst'].includes(boss.pose))pressurePatterns.add(boss.pose);
}
const result={ghost:{firstOverlap,maxDives,lateHits},boss:{patterns:[...patterns],pressurePatterns:[...pressurePatterns],hits,damage,alive:boss.alive,retries:bossGame.retries,hp:bossGame.p.hp}};
console.log('AI PROBE',JSON.stringify(result));
if(process.argv.includes('--assert')){assert.equal(firstOverlap,null,'late interrupted ghost dive intersects solid');assert(maxDives>=2);assert(lateHits>0);assert.deepEqual([...pressurePatterns].sort(),['burst','slash'],'both boss patterns must remain available under sustained sword pressure');}
