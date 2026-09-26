// Explicit focused QA fixtures, never a campaign substitute or shipping level.
import {SceneDirector} from '../scenes.mjs';
import {STEP} from '../simulation.mjs';
import {enemyVisual} from '../enemy-animation.mjs';
export async function inspect(game){
 const base=await fetch('/tests/fixtures/controller.json').then(r=>r.json()),out=[];
 for(const type of ['bear','spider']){
  const wall={id:'qa-wall',x:400,y:0,w:20,h:300,climbable:true,art:'wall'};
  const level={...base,id:'focused-qa',title:`FOCUSED ${type.toUpperCase()} QA — NOT CAMPAIGN`,spawn:{x:300,y:300,face:1},boss:null,checkpoints:[],hazards:[],surfaces:[{id:'qa-floor',x:0,y:300,w:900,h:120,kind:'solid',art:'roof-center'}],walls:type==='spider'?[wall]:[],enemies:[{id:'qa-enemy',type,x:380,y:type==='bear'?300:180,face:-1,patrol:{min:type==='bear'?340:140,max:type==='bear'?500:220},...(type==='spider'?{wallId:'qa-wall'}:{})}],exit:{x:2200,y:210,w:40,h:90,requiresBoss:false}};
  const d=new SceneDirector();d.setLevel(level);const seen=new Set();
  for(let n=0;n<220;n++){
   const input=type==='spider'?{right:true,climb:true,jump:n<18,jumpPressed:n===0,attackPressed:n===100,laserPressed:n===150}:{};
   d.update(input,STEP);const e=d.game.enemies[0],v=enemyVisual(e,game.assets.get('characters',type,e.pose));
   const labels=[];if(['windup','active','recovery'].includes(v.phase)&&e.timer<e.stateDuration*.6)labels.push(`${type}-${v.phase}`);
   if(d.game.p.wall&&d.game.attackTime)labels.push('wall-held-sword');if(d.game.p.wall&&d.game.events.includes('laser'))labels.push('wall-held-laser');
   for(const label of labels)if(!seen.has(label)){seen.add(label);game.renderer.draw(d);out.push({label:`focused-qa-${label}`,fixture:true,visual:v,frame:n,player:{x:d.game.p.x,y:d.game.p.y,wall:d.game.p.wall,pose:d.game.p.pose},png:game.renderer.ctx.canvas.toDataURL('image/png').split(',')[1]});}
  }
 }
 game.renderer.draw(game.director);return out;
}
