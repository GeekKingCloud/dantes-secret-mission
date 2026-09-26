// Explicit focused QA fixtures, never a campaign substitute or shipping level.
import {SceneDirector} from '../scenes.mjs';
import {STEP} from '../simulation.mjs';
import {enemyVisual} from '../enemy-animation.mjs';
export async function inspect(game,{paced=false,only=null}={}){
 const base=await fetch('/tests/fixtures/controller.json').then(r=>r.json()),out=[];
 for(const type of only?[only]:['bear','spider']){
  const wall={id:'qa-wall',x:400,y:0,w:20,h:300,climbable:true,art:'wall'};
  const level={...base,id:'focused-qa',title:`FOCUSED ${type.toUpperCase()} QA — NOT CAMPAIGN`,spawn:{x:300,y:300,face:1},boss:null,checkpoints:[],hazards:[],surfaces:[{id:'qa-floor',x:0,y:300,w:900,h:120,kind:'solid',art:'roof-center'}],walls:type==='spider'?[wall]:[],enemies:[{id:'qa-enemy',type,x:380,y:type==='bear'?300:180,face:-1,patrol:{min:type==='bear'?340:140,max:type==='bear'?500:220},...(type==='spider'?{wallId:'qa-wall'}:{})}],exit:{x:2200,y:210,w:40,h:90,requiresBoss:false}};
  if(type==='ghost'){level.enemies[0].y=180;level.enemies[0].patrol={min:340,max:500};}
  if(type==='zombie'){level.enemies[0].y=300;level.enemies[0].patrol={min:340,max:500};}
  const d=new SceneDirector();d.setLevel(level);const seen=new Set();let last=performance.now(),acc=0;
  const render=()=>{game.renderer.draw(d);game.renderer.text('FOCUSED QA FIXTURE — NOT CAMPAIGN',12,354,10,'#ffe1a0');};
  for(let n=0;n<(paced?420:220);n++){
   if(paced){while(acc<STEP){const now=await new Promise(requestAnimationFrame);acc+=Math.min(.05,(now-last)/1000);last=now;}acc-=STEP;}
   const input=type==='spider'?{right:true,climb:true,jump:n<18,jumpPressed:n===0,attackPressed:n===100,laserPressed:n===150}:{};
   d.update(input,STEP);const e=d.game.enemies[0],v=enemyVisual(e,game.assets.get('characters',type,e.pose));
   const labels=[];if(['windup','active','recovery'].includes(v.phase)&&e.timer<e.stateDuration*.6)labels.push(`${type}-${v.phase}`);
   if(d.game.p.wall&&d.game.attackTime)labels.push('wall-held-sword');if(d.game.p.wall&&d.game.events.includes('laser'))labels.push('wall-held-laser');
   if(paced)render();
   for(const label of labels)if(!seen.has(label)){seen.add(label);render();out.push({label:`focused-qa-${label}`,fixture:true,visual:v,frame:n,player:{x:d.game.p.x,y:d.game.p.y,wall:d.game.p.wall,pose:d.game.p.pose},png:game.renderer.ctx.canvas.toDataURL('image/png').split(',')[1]});}
  }
 }
 game.renderer.draw(game.director);return out;
}
