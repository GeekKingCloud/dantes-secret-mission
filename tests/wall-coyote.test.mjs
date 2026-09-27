import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LevelSimulation, STEP} from '../simulation.mjs';
import {BODY, FEEL} from '../player-controller.mjs';
import {wallContact} from '../geometry.mjs';

const base=JSON.parse(readFileSync(new URL('./fixtures/controller.json',import.meta.url)));
const toward=side=>({right:side===1,left:side===-1});
function tick(g,input={},n=1) {for(let k=0;k<n;k++)g.update(input);}
function grab(side,checkpoint=false) {
  const g=new LevelSimulation({...base,spawn:{x:210-side*60,y:300,face:side},
    surfaces:[{id:'floor',x:0,y:300,w:600,h:120,kind:'solid',art:'stone'}],
    walls:[{id:'wall',x:200,y:0,w:20,h:300,climbable:true,art:'wall'}],
    enemies:[],hazards:[],checkpoints:checkpoint?[{id:'rest',x:210-side*60-20,y:245,w:40,h:55,
      spawn:{x:210-side*100,y:300,face:side}}]:[],boss:null,exit:{...base.exit,requiresBoss:false}});
  tick(g,{...toward(side),jump:true,jumpPressed:true});
  for(let n=0;n<120&&!g.p.wall;n++)tick(g,{...toward(side),jump:true});
  assert.equal(wallContact(g.p,BODY,g.level),side,'arrive at real climbable geometry');
  tick(g,{},2);
  assert.equal(g.p.wall,side);assert.equal(g.p.vy,0);assert(!g.p.on);
  return g;
}
function leave(g,side) {
  tick(g,toward(-side),4);
  assert.equal(wallContact(g.p,BODY,g.level),0,'away input really leaves contact margin');
  assert.equal(g.p.wall,0);
}
function jump(g,side) {tick(g,{...toward(-side),jump:true,jumpPressed:true});}
function noMemory(g) {assert.equal(g.p.wallSide,0);assert.equal(g.p.wallCoyote,0);}

for(const side of [-1,1]) {
  test(`wall coyote ${side}: away for a few ticks then first jump preserves true second jump`,()=>{
    const g=grab(side);leave(g,side);
    tick(g,toward(-side),3);
    jump(g,side);
    assert(g.events.includes('jump'),'late wall press must be a first jump, not doublejump');
    assert(!g.events.includes('doublejump'));assert.equal(g.p.airJumps,1);
    assert.equal(g.p.vx,-side*FEEL.wallKick);assert.equal(g.p.face,-side);
    assert(g.p.kick>0);noMemory(g);
    tick(g,{...toward(-side),jump:true},3);jump(g,side);
    assert(g.events.includes('doublejump'));assert.equal(g.p.airJumps,0);assert(g.p.flip>0);
    tick(g,{...toward(-side),jump:true});jump(g,side);
    assert(!g.events.includes('jump')&&!g.events.includes('doublejump'),'no third phantom jump');
    noMemory(g);
  });
  test(`wall coyote ${side}: expiry forgets side and uses ordinary air jump`,()=>{
    const g=grab(side);leave(g,side);
    tick(g,toward(-side),Math.ceil(FEEL.wallCoyote/STEP)+1);
    noMemory(g);assert(!g.p.on);jump(g,side);
    assert(g.events.includes('doublejump'));assert.equal(g.p.airJumps,0);assert.equal(g.p.kick,0);
  });
  test(`wall coyote ${side}: last usable grace tick still preserves the air jump`,()=>{
    const g=grab(side);leave(g,side);
    while(g.p.wallCoyote>STEP*2+1e-9)tick(g,toward(-side));
    jump(g,side);
    assert(g.events.includes('jump'));assert(g.p.kick>0);assert.equal(g.p.airJumps,1);noMemory(g);
  });
  test(`wall coyote ${side}: actual checkpoint return cannot retain departure side`,()=>{
    const g=grab(side,true);assert.equal(g.checkpointId,'rest');leave(g,side);
    assert(g.damagePlayer(1,g.p.x,{pit:true}));noMemory(g);
    assert.equal(g.p.x,g.checkpoint.x);assert.equal(g.p.y,g.checkpoint.y);
    assert.notEqual(g.p.x,g.level.spawn.x);assert.equal(g.p.airJumps,1);
  });
  test(`wall coyote ${side}: deliberate kick cannot refresh grace or mint an extra jump`,()=>{
    const g=grab(side);jump(g,side);noMemory(g);
    for(let n=0;n<4;n++){tick(g,{...toward(side),jump:true});noMemory(g);assert.equal(g.p.wall,0);}
    jump(g,side);assert(g.events.includes('doublejump'));assert.equal(g.p.airJumps,0);
    tick(g,{jump:true});jump(g,side);
    assert(!g.events.includes('jump')&&!g.events.includes('doublejump'));noMemory(g);
  });
  for(const transition of ['hurt','spikes','pit','lethal','reset']) {
    test(`wall coyote ${side}: ${transition} invalidates departed-wall memory`,()=>{
      const g=grab(side);leave(g,side);
      if(transition==='reset')g.reset();
      else assert(g.damagePlayer(transition==='lethal'?4:1,g.p.x+side*20,
        {pit:transition==='pit',spikes:transition==='spikes'}));
      noMemory(g);
      if(['hurt','spikes'].includes(transition)) {
        jump(g,side);assert(!g.events.includes('jump')&&!g.events.includes('doublejump'));
        tick(g,toward(-side),20);noMemory(g);assert(!g.p.on);
        jump(g,side);assert(g.events.includes('doublejump'),'recovered airborne jump is not a stale wall kick');
      } else {
        assert.equal(g.p.x,g.level.spawn.x);assert.equal(g.p.y,g.level.spawn.y);
        assert.equal(g.p.airJumps,1);
      }
    });
  }
  test(`wall coyote ${side}: landing clears wall history and keeps ground jump`,()=>{
    const g=grab(side);
    // Continue the actual release until landing; do not inject grounded state.
    leave(g,side);
    for(let n=0;n<180&&!g.p.on;n++)tick(g,toward(-side));
    assert(g.p.on);noMemory(g);
    jump(g,side);assert(g.events.includes('jump'));assert.equal(g.p.kick,0);assert.equal(g.p.airJumps,1);
  });
}
