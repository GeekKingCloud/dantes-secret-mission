import {VIEW, MAP_NODES, introBlocking} from './scenes.mjs';
import {clamp} from './geometry.mjs';
import {canFinish,COMBO} from './simulation.mjs';
import {isWeak,ENEMY_TYPES} from './enemies.mjs';
import {BODY} from './player-controller.mjs';
export function layerOffset(layer,camera,time,width) {
  let x=layer.x-camera.x*layer.factorX+time*layer.driftX;
  if(layer.repeatX)x=((x%width)+width)%width-width;
  return {x:Math.round(x),y:Math.round(layer.y-camera.y*layer.factorY)};
}
export class Renderer {
  constructor(canvas,assets){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.assets=assets;this.clocks=new Map();}
  text(message,x,y,size=12,color='#cce5e3') {const c=this.ctx;c.fillStyle=color;c.font=`${size}px monospace`;c.fillText(message,x,y);}
  image(group,id,x,y,time=0,animation='idle',face=1,alpha=1,weak=false,scale) {
    this.assets.draw(this.ctx,group,id,animation,x,y,{time,face,alpha,weak,scale});
  }
  actor(id,asset,pose,x,y,time,face=1,alpha=1,weak=false,progress=null) {
    let clock=this.clocks.get(id);
    if(!clock||clock.pose!==pose||clock.time>time){clock={pose,time};this.clocks.set(id,clock);}
    const animation=this.assets.get('characters',asset,pose).animations[pose];
    const playTime=progress===null?time-clock.time:clamp(progress,0,.999)*(animation.frames.length/animation.fps);
    this.image('characters',asset,x,y,playTime,pose,face,alpha,weak);
  }
  tile(asset,rect,time=0) {
    const c=this.ctx,a=this.assets.get('world',asset);
    c.save();c.beginPath();c.rect(rect.x,rect.y,rect.w,rect.h);c.clip();
    for(let y=rect.y;y<rect.y+rect.h;y+=a.frameHeight)for(let x=rect.x;x<rect.x+rect.w;x+=a.frameWidth)
      this.image('world',asset,x+a.anchor[0],y+a.anchor[1],time);
    c.restore();
  }
  terrain(shape,time) {
    if(!shape.art.startsWith('roof-')){this.tile(shape.art,shape,time);return;}
    const c=this.ctx,a=this.assets.get('world',shape.art);
    // One anchored walk-plane row over full-height wall, not repeated roofs.
    this.tile('wall',shape,time);
    c.save();c.beginPath();c.rect(shape.x,shape.y-a.anchor[1],shape.w,Math.max(shape.h,a.frameHeight));c.clip();
    for(let x=shape.x;x<shape.x+shape.w;x+=a.frameWidth)this.image('world',shape.art,x+a.anchor[0],shape.y,time);
    c.restore();
  }
  hazard(h,level) {
    if(!h.art)return;
    const a=this.assets.get('world',h.art),[x,y,right,bottom]=a.opaqueBounds,c=this.ctx;
    // Fit the delivered opaque art to fixed authored hazards, not vice versa.
    c.save();c.imageSmoothingEnabled=false;c.beginPath();c.rect(h.x,h.y,h.w,h.h);c.clip();
    if(h.art==='spikes-side') {
      // The delivered strip points right. Attachment determines the outward face.
      const leftFacing=level.walls.some(w=>Math.abs(w.x-(h.x+h.w))<.01&&h.y<w.y+w.h&&h.y+h.h>w.y);
      const height=Math.max(1,Math.round((bottom-y)*h.w/(right-x)));
      if(leftFacing){c.translate(h.x*2+h.w,0);c.scale(-1,1);}
      for(let dy=h.y;dy<h.y+h.h;dy+=height)c.drawImage(a.image,x,y,right-x,bottom-y,Math.round(h.x),Math.round(dy),Math.round(h.w),height);
    }else {
      const width=Math.max(1,Math.round((right-x)*h.h/(bottom-y)));
      for(let dx=h.x;dx<h.x+h.w;dx+=width)c.drawImage(a.image,x,y,right-x,bottom-y,Math.round(dx),Math.round(h.y),width,Math.round(h.h));
    }
    c.restore();
  }
  panel(id,x,y,lines,time=0) {
    const a=this.assets.get('ui',id),scale=a.scale??1,[l,t,r,b]=a.textSafe,c=this.ctx;
    c.fillStyle='#080f20ed';c.fillRect(Math.round(x+l*scale),Math.round(y+t*scale),Math.round((r-l)*scale),Math.round((b-t)*scale));
    this.image('ui',id,x,y,time);
    lines.forEach((line,n)=>this.text(line,x+l*scale+10,y+t*scale+25+n*24,20));
  }
  draw(d) {
    const c=this.ctx;c.imageSmoothingEnabled=false;c.clearRect(0,0,VIEW.w,VIEW.h);
    if(d.state==='title') {
      this.image('world','home-interior',0,0,d.time);
      this.panel('title-frame',128,64,['KAGEBOT’S','SECRET MISSION'],d.time);
      this.text('WORLD 1 — THE CRY IN THE NIGHT',180,286,12);
    } else if(d.state==='home-intro')this.home(d);
    else if(d.state==='map')this.map(d);
    else if(['stage','boss'].includes(d.state))this.stage(d);
    else if(d.state==='world2') {
      this.image('ui','world2-tease',0,0,d.time,'idle',1,1,false,4);this.text('WORLD 2 — COMING SOON',140,160,22);
      this.text('The signal reaches beyond the mountains.',100,200);this.text('ENTER / A / TAP TO RETURN',155,310);
    } else this.text(d.state==='loading'?'LOADING LEVEL DATA…':'DEVELOPMENT ERROR',30,60,20);
    if(d.paused){c.fillStyle='#061020df';c.fillRect(0,0,VIEW.w,VIEW.h);this.text('PAUSED',260,160,24);this.text('ENTER / A / MENU TO RESUME',170,200);}
  }
  homeScenery(t) {
    this.image('world','home-interior',0,0,t);
    this.image('world','table-candle',318,298,t);
    if(t>=2){this.panel('help-bubble',330,20,[],t);this.text('HELP!',375,85,38,'#fff1c4');}
  }
  home(d) {
    const t=d.time,{hero,drone,butlerTime}=introBlocking(t);this.homeScenery(t);
    this.image('characters','robot-butler',365,292,butlerTime,t>=4.15?'eyes-widen':'idle',t>=4.15?1:-1);
    this.image('characters','kagebot',hero.x,hero.y,hero.time,hero.pose);
    this.image('characters','jetpack-drone',drone.x,drone.y,drone.time,drone.pose);
    this.text('ENTER / A / TAP — SKIP OPENING',16,345,10);
  }
  map(d) {
    this.image('world','overworld',0,0,d.time);
    const positions=[[78,245],[206,220],[314,145],[450,110],[566,65]];
    MAP_NODES.forEach((node,index)=>{
      const [x,y]=positions[index],unlocked=d.unlocked(node);
      const key=node==='home'?'map-node-home':!unlocked?'map-node-locked':d.completed.has(node)?'map-node-complete':'map-node-stage';
      const a=this.assets.get('ui',key);
      this.image('ui',key,x+a.anchor[0]-a.frameWidth/2,y+a.anchor[1]-a.frameHeight/2,d.time);
      if(index===d.selection)this.image('ui','selection',x-16,y-38,d.time);
      this.ctx.fillStyle='#080f20dd';this.ctx.fillRect(x-25,y+21,58,15);
      this.text(node==='home'?'HOME':node==='portal'?'PORTAL':node.toUpperCase(),x-23,y+32,10);
    });
    if(d.completed.has('stage3'))this.image('world','portal-animation',566,65,d.time);
    this.text('WORLD 1  ·  LEFT / RIGHT SELECT  ·  ENTER / A PLAY',25,330,11);
  }
  stageScenery(g,cam) {
    const c=this.ctx;
    for(const layer of g.level.background) {
      const a=this.assets.get('world',layer.asset),width=a.frameWidth*(a.scale??1);
      const presentation=layer.asset==='near-clouds'?{...layer,y:Math.min(layer.y,-35)}:layer;
      const pos=layerOffset(presentation,cam,g.time,width),alpha=layer.asset==='near-clouds'?.22:layer.asset==='far-clouds'?.7:1;
      if(layer.repeatX)for(let x=pos.x;x<VIEW.w;x+=width)this.image('world',layer.asset,x,pos.y,g.time,'idle',1,alpha);
      else this.image('world',layer.asset,pos.x,pos.y,g.time);
    }
    // One scene backdrop, not a second giant prop on top of the gameplay floor.
    // Its perspective ground begins at source row 135 (270 logical pixels).
    if(g.bossActive)this.image('world','boss-arena',0,Math.round(g.level.boss.y-cam.y-270),g.time);
    c.save();c.translate(-Math.round(cam.x),-Math.round(cam.y));
    for(const s of [...g.level.surfaces,...g.level.walls])this.terrain(s,g.time);
    for(const h of g.level.hazards)this.hazard(h,g.level);
    for(const prop of g.level.decor)if(prop.asset!=='boss-arena')this.image('world',prop.asset,prop.x,prop.y,g.time,prop.animation||'idle');
    if(!g.level.exit.requiresBoss||!g.boss?.alive)this.image('world','portal-animation',g.level.exit.x+g.level.exit.w/2,g.level.exit.y+g.level.exit.h,g.time);
    c.restore();
  }
  stage(d) {
    const g=d.game,c=this.ctx,cam=d.camera,p=g.p;this.stageScenery(g,cam);
    c.save();c.translate(-Math.round(cam.x),-Math.round(cam.y));
    for(const e of g.enemies)if(e.alive||e.defeatTime<.5){
      const tuning=ENEMY_TYPES[e.type];
      const duration=e.state==='windup'?tuning.windup:e.state==='attack'?tuning.active:0;
      const progress=e.stun?null:e.state==='windup'&&e.type==='zombie'?0:duration?1-e.timer/duration:null;
      this.actor(e.id,e.type,e.pose,e.x,e.y,g.time,e.face,1,isWeak(e),progress);
      if(canFinish(p,e,g.level))this.text('F / RB · EXECUTE',e.x-44,e.y-tuning.h-12,10,'#ffabb2');
    }
    this.player(g);
    c.restore();
    this.hud(g);
  }
  player(g) {
    const p=g.p,c=this.ctx;
    for(const b of g.projectiles) {
      // Emissive shot core, not a replacement for character/terrain artwork.
      c.fillStyle=b.kind==='venom'?'#b6dd65':'#c8fff5';c.fillRect(Math.round(b.x)-3,Math.round(b.y)-2,b.kind==='venom'?6:12,4);
    }
    if(p.dash)for(let n=3;n>0;n--)this.image('characters','kagebot',p.x-p.face*n*16,p.y,g.time,'dash',p.face,.1*(4-n));
    const swing=g.attackTime?COMBO[g.combo-1]:null;
    const progress=swing?(g.attackTime<swing.windup?.15*g.attackTime/swing.windup:g.attackTime<swing.windup+swing.active?.15+.7*(g.attackTime-swing.windup)/swing.active:.85+.15*(g.attackTime-swing.windup-swing.active)/swing.recovery):null;
    let x=p.x,face=p.face;
    if(p.wall&&['wall-hold','wall-climb'].includes(p.pose)){
      face=p.wall;
      const a=this.assets.get('characters','kagebot',p.pose),anim=a.animations[p.pose];
      const clock=this.clocks.get('player');
      const elapsed=clock?.pose===p.pose?Math.max(0,g.time-clock.time):0;
      const frame=anim.frames[Math.floor(elapsed*anim.fps)%anim.frames.length];
      const right=a.frameMetadata[frame].bounds[2]-1;
      x+=face*(BODY.w/2-(right-a.anchor[0]));
    }
    this.actor('player','kagebot',p.pose,x,p.y,g.time,face,p.inv&&Math.floor(g.time*18)%2?.4:1,false,progress);
  }
  hud(g) {
    const p=g.p;
    this.text(g.level.title,12,20);for(let n=0;n<p.hp;n++)this.image('ui','health',20+n*20,32,0,'idle',1,1,false,.5);
    for(let n=0;n<p.ammo;n++)this.image('ui','ammo',20+n*20,52,0,'idle',1,1,false,.5);
    this.text(`RETRIES ${g.retries}`,520,20,10);
    if(g.bossActive&&g.boss.alive)this.text(g.boss.hp<=g.boss.maxHp/2?'MASKED SHADOW · ENRAGED':'MASKED SHADOW',12,82,12);
  }
}
