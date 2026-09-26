import {LevelSimulation} from './simulation.mjs';
import {clamp} from './geometry.mjs';
export const VIEW = Object.freeze({w:640,h:360});
export const MAP_NODES = Object.freeze(['home','stage1','stage2','stage3','portal']);
export class Camera {
  constructor(){this.x=0;this.y=0;this.initialized=false;}
  follow(p,bounds,dt,snap=false) {
    const x=clamp(p.x-VIEW.w*.5+p.face*70+p.vx*.10,bounds.x,bounds.x+bounds.w-VIEW.w);
    const y=clamp(p.y-VIEW.h*.62+clamp(p.vy*.12,-40,40),bounds.y,bounds.y+bounds.h-VIEW.h);
    const blend=snap||!this.initialized?1:1-Math.exp(-8*dt);
    this.x+=(x-this.x)*blend;this.y+=(y-this.y)*blend;this.initialized=true;
  }
}
export function introBeat(time) {
  if(time<2)return 'meditate';
  if(time<2.7)return 'help';
  if(time<3.25)return 'startled';
  if(time<4.15)return 'run';
  return 'departure';
}
export class SceneDirector {
  constructor(){this.state='title';this.time=0;this.completed=new Set();this.selection=0;this.game=null;this.requestedLevel=null;this.paused=false;this.camera=new Camera();this.events=[];this.error=null;}
  enter(state){this.state=state;this.time=0;this.events.push('menu');}
  unlocked(node){const index=MAP_NODES.indexOf(node);return index<=1||this.completed.has(`stage${index-1}`);}
  confirm() {
    if(this.paused){this.paused=false;return;}
    if(this.state==='title'){this.enter('home-intro');return;}
    if(this.state==='home-intro'){this.selection=1;this.enter('map');return;}
    if(this.state==='world2'){this.selection=4;this.enter('map');return;}
    if(this.state!=='map')return;
    const node=MAP_NODES[this.selection];
    if(!this.unlocked(node))return;
    if(node==='home')this.enter('home-intro');
    else if(node==='portal'){this.events.push('portal');this.enter('world2');}
    else {this.requestedLevel=node;this.enter('loading');}
  }
  setLevel(level) {
    this.game=new LevelSimulation(level);this.requestedLevel=null;this.camera=new Camera();
    this.camera.follow(this.game.p,level.camera,0,true);this.enter('stage');
  }
  update(input,dt) {
    this.events=[];
    if(input.pausePressed&&['stage','boss','home-intro'].includes(this.state))this.paused=!this.paused;
    if(this.paused){if(input.confirmPressed)this.paused=false;return;}
    if(input.confirmPressed&&!['stage','boss','loading','error'].includes(this.state)){this.confirm();return;}
    const oldTime=this.time;this.time+=dt;
    if(this.state==='home-intro') {
      if(oldTime<2&&this.time>=2)this.events.push('help');
      if(oldTime<4.15&&this.time>=4.15)this.events.push('jetpack');
      if(this.time>=5.8){this.selection=1;this.enter('map');}
    } else if(this.state==='map') {
      if(input.leftPressed||input.rightPressed)this.events.push('menu');
      if(input.leftPressed)this.selection=(this.selection+MAP_NODES.length-1)%MAP_NODES.length;
      if(input.rightPressed)this.selection=(this.selection+1)%MAP_NODES.length;
    } else if(['stage','boss'].includes(this.state)) {
      this.game.update(input,dt);this.events.push(...this.game.events);
      if(this.game.events.includes('retry')){this.state='stage';this.camera.follow(this.game.p,this.game.level.camera,0,true);}
      if(this.game.bossActive)this.state='boss';
      this.camera.follow(this.game.p,this.game.level.camera,dt);
      if(this.game.won) {
        const id=this.game.level.id;this.completed.add(id);
        this.selection=clamp(MAP_NODES.indexOf(id)+1,1,4);this.enter('map');
      }
    }
  }
  get music() {
    if(this.state==='home-intro'||this.state==='title')return 'home';
    if(this.state==='map')return 'overworld';
    if(this.state==='world2')return 'world2';
    if(this.state==='boss')return 'boss';
    if(this.state==='stage')return this.game.level.music;
    return null;
  }
}
