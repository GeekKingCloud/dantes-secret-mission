import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LevelSimulation,canFinish,COMBO,STEP} from '../simulation.mjs';
import {runSteps} from '../input.mjs';
import {enemyBox,isWeak,ENEMY_TYPES} from '../enemies.mjs';
import {combatFixture,bearSequence} from './fixtures/labs.mjs';
const base=JSON.parse(readFileSync(new URL('./fixtures/controller.json',import.meta.url)));
test('early buffered sword chain and recovery dash-cancel survive 120/144/240Hz',()=>{
  for(const hz of [120,144,240]){
    const g=new LevelSimulation(combatFixture(base)),pending=new Set(),schedule=[...bearSequence],heldUntil=new Map();
    const queued=new Set(),chained=new Set();let acc=0,eventIndex=0,dashCancelledRecovery=false;
    for(let frame=0;frame<Math.ceil(1.5*hz);frame++){
      // Direction taps remain physically held for a physics quantum; action
      // edges can be shorter and must survive render frames with no step.
      const held=Object.fromEntries([...heldUntil].filter(([,until])=>frame/hz<until-1e-9).map(([key])=>[key,true]));
      while(eventIndex<schedule.length&&schedule[eventIndex][0]*STEP<=frame/hz+1e-9){
        for(const [key,value] of Object.entries(schedule[eventIndex++][1])){
          if(key.endsWith('Pressed')&&value)pending.add(key);
          else {held[key]=value;heldUntil.set(key,frame/hz+STEP);}
        }
      }
      acc=runSteps(acc+1/hz,pending,edges=>{
        const input={...held};for(const key of edges)input[key]=true;
        const priorCombo=g.combo,priorSwing=g.swing,priorTime=g.attackTime;
        g.update(input);
        if(input.attackPressed&&g.attackQueue>0)queued.add(g.combo);
        if(g.swing>priorSwing&&priorSwing>0){assert(priorTime>0,'next strike must start without an idle gap');chained.add(g.combo);}
        if(g.p.events.includes('dash')){
          const phase=COMBO[priorCombo-1];
          assert(priorTime>=phase.windup+phase.active&&priorTime<phase.windup+phase.active+phase.recovery,'dash pressed during recovery');
          assert.equal(g.attackTime,0);assert(g.p.dash>0);dashCancelledRecovery=true;
        }
      });
    }
    assert.deepEqual([...queued],[1,2],`${hz}Hz early press buffers both followups`);
    assert.deepEqual([...chained],[2,3],`${hz}Hz no combo gaps`);assert(dashCancelledRecovery,`${hz}Hz recovery cancel`);
    assert(!g.enemies[0].alive,`${hz}Hz complete sequence`);assert.equal(g.p.ammo,4);assert.equal(g.p.hp,4);
  }
});
test('input-only three-hit chain, ground dash through bear, turn, rear execute, refund',()=>{
  const g=new LevelSimulation(combatFixture(base)),schedule=new Map(bearSequence),e=g.enemies[0];
  const seen=new Set();let weak=false,dashHP;
  for(let frame=0;frame<165;frame++){
    g.update(schedule.get(frame)||{});if(g.combo)seen.add(g.combo);weak||=isWeak(e);
    if(g.p.dash){dashHP??=g.p.hp;assert.equal(g.p.hp,dashHP);}
    if(frame===130){assert(g.p.box.x>enemyBox(e).x+enemyBox(e).w,'player fully clears bear');assert(canFinish(g.p,e,g.level),'real rear window');}
  }
  assert.deepEqual([...seen],[1,2,3]);assert(weak);assert(!e.alive);assert.equal(g.p.hp,4);assert.equal(g.p.ammo,4);
  g.update({finishPressed:true});assert.equal(g.p.ammo,4,'no duplicate refund');
});
test('active attacks cannot damage dash crossing walker or widest bear',()=>{
  for(const type of ['zombie','bear']){
    const g=new LevelSimulation(combatFixture(base,type)),e=g.enemies[0];g.p.face=1;
    e.state='attack';e.timer=.4;e.pose=type==='bear'?'slash':'attack';
    g.update({dashPressed:true});for(let n=0;n<23;n++)g.update({});
    assert.equal(g.p.hp,4,type);assert(g.p.box.x>enemyBox(e).x+enemyBox(e).w,type);
  }
});
test('finisher forbids occluded and front targets; weak threshold is per type',()=>{
  const g=new LevelSimulation(combatFixture(base)),e=g.enemies[0];g.p.x=230;g.p.face=-1;e.hp=2;
  assert(isWeak(e));assert(canFinish(g.p,e,g.level));g.level.walls.push({x:190,y:200,w:10,h:100,climbable:true});
  assert(!canFinish(g.p,e,g.level));g.level.walls.pop();e.face=1;assert(!canFinish(g.p,e,g.level));
  e.face=-1;e.hp=3;assert(!isWeak(e));
});
test('zombie notices, approaches, commits windup and recovery facing before delayed turn',()=>{
  const g=new LevelSimulation(combatFixture(base,'zombie')),e=g.enemies[0];e.x=220;e.patrol.min=90;
  let states=new Set(),x=e.x;
  for(let n=0;n<420;n++){g.update({});states.add(e.state);if(e.state==='windup')break;}
  assert(states.has('approach'));assert(e.x<x);assert.equal(e.state,'windup');assert.equal(e.pose,'attack');
  g.p.x=e.x+50;g.p.inv=10;const face=e.face;
  for(let n=0;n<100;n++){g.update({});assert.equal(e.face,face);}
  assert.equal(e.state,'recover');
  for(let n=0;n<Math.ceil((ENEMY_TYPES.zombie.recover+.5)*120);n++)g.update({});
  assert.equal(e.face,1,'turn eventually follows player after recovery + .45s turn window');
});
