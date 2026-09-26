import {LevelSimulation,STEP,slashBox,canFinish,COMBO} from '../simulation.mjs';
import {enemyBox,isWeak} from '../enemies.mjs';
import {BrowserInput,runSteps} from '../input.mjs';
import {Camera} from '../scenes.mjs';
import {combatFixture} from './fixtures/labs.mjs';
const params=new URLSearchParams(location.search),base=await(await fetch('fixtures/controller.json')).json();
const g=new LevelSimulation(params.get('scenario')==='combat'?combatFixture(base):base);
const input=new BrowserInput(),camera=new Camera(),canvas=document.querySelector('canvas'),c=canvas.getContext('2d');
let acc=0,last=0,ticks=0;const poses=new Set();
function snapshot(){return {ticks,x:g.p.x,y:g.p.y,vx:g.p.vx,vy:g.p.vy,on:g.p.on,wall:g.p.wall,dash:g.p.dash,hp:g.p.hp,ammo:g.p.ammo,combo:g.combo,pose:g.p.pose,poses:[...poses],enemies:g.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,face:e.face,alive:e.alive,weak:isWeak(e),state:e.state,pose:e.pose,finish:canFinish(g.p,e,g.level)}))};}
function draw(){camera.follow(g.p,g.level.camera,STEP);c.fillStyle='#101b2e';c.fillRect(0,0,640,360);c.save();c.translate(-camera.x,-camera.y);
 const box=(r,color)=>{c.fillStyle=color;c.fillRect(r.x,r.y,r.w,r.h);};
 for(const s of g.level.surfaces)box(s,'#39516a');for(const w of g.level.walls)box(w,'#617889');for(const h of g.level.hazards)box(h,'#8a404f');
 for(const e of g.enemies)if(e.alive){box(enemyBox(e),isWeak(e)?'#ed526c':'#bea773');c.fillStyle='#fff';c.font='8px monospace';c.fillText(`${e.type} ${e.state}`,e.x-30,e.y-65);c.fillText(e.face>0?'>':'<',e.x,e.y-15);if(canFinish(g.p,e,g.level))c.fillText('F / RB EXECUTE',e.x-30,e.y-52);}
 if(g.attackTime){const a=COMBO[g.combo-1];if(g.attackTime>=a.windup&&g.attackTime<=a.windup+a.active)box(slashBox(g.p,g.combo),'#7bdde777');}
 box(g.p.box,g.p.dash?'#a4fffa':'#68b3de');c.fillStyle='#fff';c.fillText(g.p.face>0?'>':'<',g.p.x-3,g.p.y-20);c.restore();
 c.fillStyle='#f3cd75';c.font='12px monospace';c.fillText('DIAGNOSTIC HITBOXES — NOT SHIPPING ART',12,18);
 document.querySelector('#status').textContent=JSON.stringify(snapshot(),null,2);
}
function frame(dt){const held=input.poll(navigator.getGamepads?.());acc=runSteps(acc+dt,input.pending,edges=>{g.update(input.snapshot(held,edges));poses.add(g.p.pose);ticks++;});draw();}
window.lab={snapshot,frame,advance(n=1){for(let k=0;k<n;k++)frame(STEP);return snapshot();},pending:()=>[...input.pending]};
function loop(ms){frame(Math.min(.05,(ms-last)/1000||0));last=ms;requestAnimationFrame(loop);}
draw();if(!params.has('manual'))requestAnimationFrame(loop);
