export const W=960,H=540,END=1900,AMMO=4;
export const ROOFS=[{x:0,end:430,y:420},{x:500,end:780,y:345},{x:850,end:1190,y:275},{x:1260,end:1550,y:370},{x:1620,end:1900,y:315}];
export const SPIKES=[{x:754,y:345},{x:1155,y:275},{x:1515,y:370}];
const spawn=[{x:285,roof:0},{x:1015,roof:2},{x:1430,roof:3},{x:1725,roof:4}];
export const BODY={w:18,h:47}, ENEMY={w:27,h:43};
export const box=(x,y,w,h)=>({left:x-w/2,right:x+w/2,top:y-h,bottom:y});
export const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
export const slash=p=>({left:p.x+(p.face>0?8:-58),right:p.x+(p.face>0?58:-8),top:p.y-44,bottom:p.y-7});
export const enemyBox=e=>box(e.x,ROOFS[e.roof].y,ENEMY.w,ENEMY.h);
export function newGame(){return {p:{x:70,y:420,vx:0,vy:0,face:1,hp:4,ammo:AMMO,on:true,jumps:0,wall:0,coyote:0,buffer:0,dash:0,dashCD:0,inv:0,swing:0,attack:0,attackCD:0,combo:0,comboTime:0,laserCD:0,flip:0},enemies:spawn.map((s,i)=>({...s,home:s.x,face:i%2?-1:1,hp:3,alive:true,hitSwing:-1,stun:0})),bolts:[],checkpoint:0,retries:0,falls:0,finishers:0,hits:0,won:false,time:0,events:[]};}
export function retry(g){const n=newGame();n.retries=g.retries+1;Object.assign(g,n);}
export function canFinish(p,e){return e.alive&&e.hp===1&&Math.abs(p.x-e.x)<34&&overlap(box(p.x,p.y,BODY.w,BODY.h),enemyBox(e))&&Math.sign(e.x-p.x)===p.face&&Math.sign(p.x-e.x)===-e.face;}
function hurt(g){const p=g.p;if(p.inv>0||p.dash>0)return;p.hp--;g.hits++;g.events.push('hurt');if(p.hp<=0){retry(g);g.events.push('retry');return;}p.inv=1.2;p.vy=-230;p.on=false;p.vx=-p.face*105;}
function kill(g,e){e.hp=0;e.alive=false;g.events.push('defeat');}
export function step(g,i={},dt=1/120){if(g.won)return;dt=Math.min(Math.max(dt,0),1/60);const p=g.p;g.events=[];g.time+=dt;for(const k of ['coyote','buffer','dash','dashCD','inv','attack','attackCD','comboTime','laserCD','flip'])p[k]=Math.max(0,p[k]-dt);
 if(i.jumpPressed)p.buffer=.13;
 if(p.on)p.coyote=.1;
 const m=Number(!!i.right)-Number(!!i.left);
 if(m&&!p.dash)p.face=m;
 if(i.finishPressed){const e=g.enemies.find(e=>canFinish(p,e));if(e){kill(g,e);p.ammo=Math.min(AMMO,p.ammo+1);g.finishers++;g.events.push('combo_impact');p.attack=.22;}}
 if(i.attackPressed&&p.attackCD<=0){p.combo=p.comboTime?p.combo%3+1:1;p.comboTime=.53;p.attack=.19;p.attackCD=.21;p.swing++;g.events.push('sword');}
 if(i.laserPressed&&p.ammo&&p.laserCD<=0){p.ammo--;p.laserCD=.32;g.bolts.push({x:p.x+p.face*17,y:p.y-27,dir:p.face,life:.78});g.events.push('laser');}
 if(i.dashPressed&&p.dashCD<=0){p.dash=.19;p.dashCD=.85;p.vy=Math.min(p.vy,40);g.events.push('dash');}
 if(p.buffer&&(p.coyote||p.jumps<2||p.wall)){const wall=p.wall;const double=!wall&&!p.coyote&&p.jumps>0;p.vy=wall?-440:double?-410:-440;if(wall){p.vx=-wall*230;p.face=-wall;p.jumps=1;}else p.jumps++;if(double)p.flip=.55;p.buffer=0;p.coyote=0;p.on=false;p.wall=0;g.events.push(double?'doublejump':'jump');}
 const wasY=p.y,wasX=p.x,oldWall=p.wall;
 const target=p.dash?p.face*490:m*235;p.vx+=Math.max(-1850*dt,Math.min(1850*dt,target-p.vx));if(!m&&!p.dash)p.vx*=Math.max(0,1-10*dt);
 p.x=Math.max(9,Math.min(END-9,p.x+p.vx*dt));p.wall=0;
 for(const r of ROOFS){if(wasY<=r.y+1||wasY-BODY.h>H+65)continue;
 if(wasX+9<=r.x&&p.x+9>r.x){p.x=r.x-9;p.vx=0;p.wall=1;}
 if(wasX-9>=r.end&&p.x-9<r.end){p.x=r.end+9;p.vx=0;p.wall=-1;}}
 if(!p.wall&&!p.on)for(const r of ROOFS)if(p.y>r.y+3){if(Math.abs(p.x+9-r.x)<1.5)p.wall=1;else if(Math.abs(p.x-9-r.end)<1.5)p.wall=-1;}
 if(p.wall&&i.climb){p.vy=-160;p.jumps=Math.min(p.jumps,1);}else{p.vy=Math.min(680,p.vy+1050*dt);if(p.wall&&p.vy>100)p.vy=100;}
 p.y+=p.vy*dt;p.on=false;
 if(p.vy>=0)for(const r of ROOFS)if(wasY<=r.y+.1&&p.y>=r.y&&p.x+8>r.x&&p.x-8<r.end){p.y=r.y;p.vy=0;p.on=true;p.jumps=0;p.flip=0;p.wall=0;break;}
 if(p.wall&&i.climb&&oldWall===p.wall&&p.y<wasY)p.vx=0;
 for(const s of SPIKES)if(p.inv<=0&&p.dash<=0&&Math.abs(p.x-s.x)<15&&p.y>s.y-15&&p.y<s.y+16){hurt(g);if(g.p!==p)return;break;}
 for(const e of g.enemies){if(!e.alive)continue;e.stun=Math.max(0,e.stun-dt);if(!e.stun){e.x+=e.face*25*dt;if(e.x>e.home+26||e.x<e.home-26)e.face*=-1;}
 if(p.attack&&e.hitSwing!==p.swing&&overlap(slash(p),enemyBox(e))){e.hp--;e.hitSwing=p.swing;e.stun=.3;g.events.push('combo_impact');if(e.hp<=0)kill(g,e);}
 if(e.alive&&overlap(box(p.x,p.y,BODY.w,BODY.h),enemyBox(e))){hurt(g);if(g.p!==p)return;}
 }
 for(const b of g.bolts){b.x+=b.dir*570*dt;b.life-=dt;for(const e of g.enemies)if(b.life>0&&e.alive&&overlap({left:b.x-5,right:b.x+5,top:b.y-3,bottom:b.y+3},enemyBox(e))){e.hp--;e.stun=.3;b.life=0;g.events.push('combo_impact');if(e.hp<=0)kill(g,e);}}
 g.bolts=g.bolts.filter(b=>b.life>0&&b.x>0&&b.x<END);
 if(p.y>H+90){g.falls++;p.hp--;if(p.hp<=0){retry(g);g.events.push('retry');}else{const r=ROOFS[g.checkpoint];p.x=r.x+55;p.y=r.y;p.vx=0;p.vy=0;p.on=true;p.wall=0;p.jumps=0;p.inv=1.5;g.events.push('hurt');}return;}
 for(let n=ROOFS.length-1;n>g.checkpoint;n--)if(p.x>ROOFS[n].x+45&&p.y<=ROOFS[n].y+8){g.checkpoint=n;break;}
 if(p.x>END-50&&p.y<ROOFS.at(-1).y+15){g.won=true;g.events.push('victory');}
}
