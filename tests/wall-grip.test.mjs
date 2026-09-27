import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LevelSimulation, COMBO} from '../simulation.mjs';
import {FEEL} from '../player-controller.mjs';
import {overlap, solids, wallContact} from '../geometry.mjs';

const base=JSON.parse(readFileSync(new URL('./fixtures/controller.json',import.meta.url)));
const toward=side=>({right:side===1,left:side===-1});
function room(side,wall={}) {
  return {...base,spawn:{x:210-side*60,y:300,face:side},
    surfaces:[{id:'floor',x:0,y:300,w:600,h:120,kind:'solid',art:'stone'}],
    walls:[{id:'wall',x:200,y:0,w:20,h:300,climbable:true,art:'wall',...wall}],
    enemies:[],hazards:[],checkpoints:[],boss:null,exit:{x:2300,y:0,w:40,h:90,requiresBoss:false}};
}
function tick(g,input={},n=1) {
  for(let k=0;k<n;k++) {
    g.update(input);
    assert(!solids(g.level).some(s=>overlap(g.p.box,s)),'fixed body stays outside solids');
  }
}
function until(g,condition,input,limit=180) {
  for(let n=0;n<limit&&!condition();n++)tick(g,input);
  assert(condition(),'bounded input sequence reaches target');
}
function grab(side,falling=false) {
  const g=new LevelSimulation(room(side));
  tick(g,{...toward(side),jump:true,jumpPressed:true});
  until(g,()=>g.p.wall===side,{...toward(side),jump:!falling});
  assert(!g.p.on);assert(falling?g.p.vy>0:g.p.vy<0,'arrives during actual jump rise/fall');
  assert.equal(wallContact(g.p,{w:18,h:42},g.level),side);
  return g;
}
function stationary(g,input,n) {
  const {x,y}=g.p,side=g.p.wall;
  for(let k=0;k<n;k++) {
    tick(g,typeof input==='function'?input(k):input);
    assert.equal(g.p.wall,side,'real contact remains');
    assert.equal(g.p.x,x,'no horizontal drift');
    assert.equal(g.p.y,y,'no vertical drift');
    assert.equal(g.p.vy,0);
  }
}

for(const side of [-1,1]) {
  test(`wall grip ${side}: falling contact stops gravity slide without held direction`,()=>{
    const g=grab(side,true);
    stationary(g,{},600);
  });
  test(`wall grip ${side}: release direction arrests jump rise and holds for five seconds`,()=>{
    const g=grab(side);
    stationary(g,{},600);
    assert.equal(g.p.pose,'wall-hold');
  });
  test(`wall grip ${side}: release climb stops immediately, with or without toward input`,()=>{
    const g=grab(side),start=g.p.y;
    tick(g,{climb:true},24);
    assert(Math.abs(g.p.y-(start-FEEL.wallClimb*24/120))<1e-9);
    stationary(g,{},120);
    tick(g,{climb:true},12);
    stationary(g,toward(side),120);
  });
  test(`wall grip ${side}: all sword phases and laser keep neutral contact stationary`,()=>{
    const g=grab(side),phases=new Set();
    stationary(g,n=>({attackPressed:n%18===0,laserPressed:n===0}),360);
    // Repeat a complete buffered combo, recording actual attack poses and recovery.
    stationary(g,n=>{
      if(g.attackTime){
        const a=COMBO[g.combo-1];
        phases.add(`${g.combo}:${g.attackTime<a.windup?'startup':g.attackTime<a.windup+a.active?'active':'recovery'}`);
        assert.equal(g.p.pose,`sword-${g.combo}`);
      }
      return {attackPressed:n%18===0};
    },120);
    for(const n of [1,2,3])for(const phase of ['startup','active','recovery'])assert(phases.has(`${n}:${phase}`));
    assert.equal(g.p.ammo,3);assert.equal(g.p.hp,4);
    stationary(g,{},60);assert.equal(g.attackTime,0);assert.equal(g.p.pose,'wall-hold');
  });
  test(`wall grip ${side}: away input detaches; jump lock separates before same-wall regrab`,()=>{
    const away=grab(side);stationary(away,{},1);
    const start={x:away.p.x,y:away.p.y};
    tick(away,toward(-side),20);
    assert.equal(away.p.wall,0);assert((away.p.x-start.x)*side<-20);assert(away.p.y>start.y);

    const g=grab(side),x=g.p.x;
    tick(g,{...toward(side),jump:true,jumpPressed:true});
    assert.equal(g.p.wall,0);assert.equal(g.p.vx,-side*FEEL.wallKick);assert(g.p.vy<-390);
    for(let n=0;n<15;n++) {
      tick(g,{...toward(side),jump:true});
      assert.equal(g.p.wall,0,'toward input cannot instantly reattach during kick lock');
    }
    assert((g.p.x-x)*side<-35);
    // Complete the collision sweep: contact sensing includes a 1.1px approach margin.
    until(g,()=>g.p.wall===side&&g.p.vx===0,{...toward(side),jump:true});
    stationary(g,{},120);
  });
  test(`wall grip ${side}: hurt interrupts sword and detaches without gripping knockback`,()=>{
    const g=grab(side);tick(g,{attackPressed:true});
    const {x,y}=g.p;
    assert(g.damagePlayer(1,g.p.x+side*20));
    tick(g,{},8);
    assert.equal(g.p.hp,3);assert.equal(g.attackTime,0);assert.equal(g.p.pose,'hurt');
    assert.equal(g.p.wall,0);assert((g.p.x-x)*side<-10);assert(g.p.y<y);
  });
  test(`wall grip ${side}: climbing past top releases; steering onto roof lands safely`,()=>{
    const g=grab(side);
    until(g,()=>!g.p.wall,{climb:true},400);
    assert(g.p.y<=1,'actual top reached');
    const y=g.p.y;
    tick(g,{},4);assert.equal(g.p.wall,0);assert(g.p.y!==y,'no sticky grip above geometry');
    until(g,()=>g.p.on,toward(side));
    assert(Math.abs(g.p.y)<1e-9,'lands on solid wall top');assert.equal(g.p.wall,0);
  });
  test(`wall grip ${side}: no catch below wall bottom or against unclimbable wall`,()=>{
    const below=new LevelSimulation(room(side,{h:150}));
    tick(below,{...toward(side),jump:true,jumpPressed:true});
    tick(below,{...toward(side),jump:true},90);
    assert.equal(below.p.wall,0);assert(below.p.on);assert.equal(below.p.y,300);
    const sealed=new LevelSimulation(room(side,{climbable:false}));
    tick(sealed,{...toward(side),jump:true,jumpPressed:true});
    for(let n=0;n<90;n++){tick(sealed,{...toward(side),jump:true});assert.equal(sealed.p.wall,0);}
    assert(sealed.p.on);
  });
}
