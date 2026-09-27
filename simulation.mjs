import {PlayerController} from './player-controller.mjs';
import {overlap, rect, solids} from './geometry.mjs';
import {validateLevel} from './level-schema.mjs';
import {createEnemy, updateEnemy, enemyBox, isWeak, ENEMY_TYPES} from './enemies.mjs';

export const STEP = 1/120, AMMO = 4;
export const ACTION_CUE = Object.freeze({laser:.16,finisher:.25});
export const CHARGE_CUE = .38;
export const COMBO = Object.freeze([
  {reach:74,windup:.035,active:.10,recovery:.105,damage:1},
  {reach:82,windup:.04,active:.11,recovery:.11,damage:1},
  {reach:94,windup:.065,active:.13,recovery:.18,damage:2},
]);
export function slashBox(p, combo) {
  const reach=COMBO[combo-1].reach;
  return rect(p.face>0?p.x-6:p.x-reach,p.y-43,reach+6,38);
}
export function canFinish(p,e,level) {
  const between=rect(Math.min(p.x,e.x),Math.min(p.y,e.y)-28,Math.abs(p.x-e.x),6);
  return e.active && e.type!=='masked-mutant-boss' && isWeak(e) &&
    Math.abs(p.x-e.x)<=88+ENEMY_TYPES[e.type].w/2 && Math.abs(p.y-e.y)<30 &&
    Math.sign(e.x-p.x)===p.face && Math.sign(p.x-e.x)===-e.face &&
    (!level||!solids(level).some(s=>overlap(between,s)));
}
export class LevelSimulation {
  constructor(level) {
    this.level=validateLevel(structuredClone(level));this.retries=0;this.reset();
  }
  reset() {
    this.p=new PlayerController(this.level.spawn);this.p.update({},this.level,STEP);
    this.enemies=this.level.enemies.map(spec=>createEnemy(spec,this.level));
    this.boss=this.level.boss?createEnemy(this.level.boss):null;
    if(this.boss)this.enemies.push(this.boss);
    this.projectiles=[];this.checkpoint=this.level.spawn;this.checkpointId=null;
    this.won=false;this.time=0;this.events=[];this.hitstop=0;this.pending=new Set();
    this.combo=0;this.comboWindow=0;this.attackTime=0;this.swing=0;this.attackQueue=0;
    this.laserCD=0;this.actionPose=null;this.actionTime=0;this.bossActive=false;
    this.chargeTime=0;this.chargePip=-1;
  }
  retry() {this.retries++;this.reset();this.events.push('retry');}
  damagePlayer(amount,sourceX,{pit=false,spikes=false}={}) {
    const p=this.p;
    if(!pit&&(p.inv>0||(!spikes&&p.dashInv>0)))return false;
    p.hp-=amount;this.events.push('hurt');
    p.wallCoyote=0;p.wallSide=0;
    if(p.hp<=0){this.retry();return true;}
    this.attackTime=0;this.attackQueue=0;p.dash=0;p.dashInv=0;p.hurt=.16;p.inv=1;
    this.actionTime=0;this.actionPose=null;p.pose='hurt';
    if(pit) {
      Object.assign(p,this.checkpoint,{vx:0,vy:0,on:false,wall:0,airJumps:1,buffer:0,coyote:0,kick:0,flip:0});
    } else {
      p.vx=(Math.sign(p.x-sourceX)||-p.face)*170;p.vy=-210;p.on=false;
    }
    return true;
  }
  hitEnemy(e,damage) {
    e.hp=Math.max(0,e.hp-damage);e.weak=isWeak(e);
    // Hurt interrupts the strike, leaving a real committed-facing rear window.
    // One boss stagger per committed pattern: damage always lands, but repeated
    // buffered hits cannot erase every telegraph and active attack indefinitely.
    if(e.type!=='masked-mutant-boss'||!e.interrupted){
      e.stun=.17;e.state='recover';e.timer=.55;e.stateDuration=.55;e.recoveryVisualStart=.17;e.turnWait=.45;
      e.attackTrack??=e.type==='masked-mutant-boss'?'slash':e.type==='ghost'?'dive':e.type==='spider'?'venom':'melee';
      if(e.type==='masked-mutant-boss')e.interrupted=true;
    }
    this.events.push('combo_impact');this.hitstop=Math.max(this.hitstop,.035);
    if(!e.hp){e.alive=false;e.pose='defeat';e.defeatTime=0;this.events.push('defeat');if(e.type==='masked-mutant-boss')this.events.push('portal-open');}
  }
  startAttack() {
    this.combo=this.comboWindow>0?this.combo%3+1:1;
    this.comboWindow=.55;this.attackTime=Number.EPSILON;this.attackQueue=0;this.swing++;
    this.events.push('sword');
  }
  combat(i,dt) {
    const p=this.p;
    this.comboWindow=Math.max(0,this.comboWindow-dt);
    this.attackQueue=Math.max(0,this.attackQueue-dt);
    this.laserCD=Math.max(0,this.laserCD-dt);this.actionTime=Math.max(0,this.actionTime-dt);
    this.chargeTime=Math.max(0,this.chargeTime-dt);
    if(p.events.includes('dash')) {this.attackTime=0;this.attackQueue=0;this.comboWindow=0;}
    if(i.attackPressed)this.attackQueue=.18;
    if(p.hurt||p.dash){this.actionTime=0;this.actionPose=null;return;}
    if(i.finishPressed) {
      const e=this.enemies.find(e=>canFinish(p,e,this.level));
      if(e){
        this.hitEnemy(e,e.hp);
        if(p.ammo<AMMO){this.chargePip=p.ammo;p.ammo++;this.chargeTime=CHARGE_CUE;}
        p.inv=Math.max(p.inv,.22);this.actionPose='finisher';this.actionTime=ACTION_CUE.finisher;this.attackTime=0;
      }
    }
    if(i.laserPressed&&p.ammo>0&&!this.laserCD) {
      p.ammo--;this.laserCD=.3;this.actionPose='laser';this.actionTime=ACTION_CUE.laser;
      this.projectiles.push({owner:'player',kind:'laser',x:p.x+p.face*12,y:p.y-25,vx:p.face*650,vy:0,life:1});
      this.events.push('laser');
    }
    if(this.attackQueue&&!this.attackTime)this.startAttack();
    if(this.attackTime) {
      this.attackTime+=dt;
      const a=COMBO[this.combo-1];
      if(this.attackTime>=a.windup&&this.attackTime<=a.windup+a.active) {
        for(const e of this.enemies)if(e.alive&&e.active&&e.hitSwing!==this.swing&&overlap(slashBox(p,this.combo),enemyBox(e))) {
          e.hitSwing=this.swing;this.hitEnemy(e,a.damage);
        }
      }
      if(this.attackTime>=a.windup+a.active+a.recovery){this.attackTime=0;if(this.attackQueue)this.startAttack();}
    }
  }
  update(input={},dt=STEP) {
    if(this.won)return;
    if(!(dt>0&&dt<=1/60))throw new Error('Simulation requires positive fixed step <= 1/60s');
    this.events=[];
    // Press edges arrive even during hitstop. Deliver them once on thaw.
    for(const action of ['jump','attack','dash','laser','finish'])if(input[`${action}Pressed`])this.pending.add(action);
    if(this.hitstop>0){this.hitstop=Math.max(0,this.hitstop-dt);return;}
    const i={...input};for(const action of this.pending)i[`${action}Pressed`]=true;this.pending.clear();
    this.time+=dt;
    const p=this.p;p.update(i,this.level,dt);this.events.push(...p.events);
    this.combat(i,dt);
    // Authored one-shot cues own the short visual window, not the combat clock.
    // Sword buffering/hits continue underneath; movement is never locked by art.
    p.pose=p.hurt?'hurt':p.dash?'dash':this.actionTime?this.actionPose:this.attackTime?`sword-${this.combo}`:p.pose;
    for(const cp of this.level.checkpoints)if(overlap(p.box,cp)){if(this.checkpointId!==cp.id)this.events.push('checkpoint');this.checkpoint=cp.spawn;this.checkpointId=cp.id;}
    for(const h of this.level.hazards)if(overlap(p.box,h)) {
      this.damagePlayer(h.damage,h.x+h.w/2,{pit:h.type==='pit',spikes:h.type==='spikes'});
      if(this.p!==p||h.type==='pit')return;
    }
    if(p.y>this.level.bounds.y+this.level.bounds.h){this.damagePlayer(1,p.x,{pit:true});return;}
    if(this.boss&&!this.bossActive&&overlap(p.box,this.level.boss.trigger)) {
      this.bossActive=true;this.boss.active=true;this.events.push('boss-start');
    }
    for(const e of this.enemies){updateEnemy(e,this,dt);if(this.p!==p)return;}
    for(const b of this.projectiles) {
      const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.age=(b.age||0)+dt;
      const swept=rect(Math.min(oldX,b.x)-3,Math.min(oldY,b.y)-3,Math.abs(b.x-oldX)+6,Math.abs(b.y-oldY)+6);
      if(solids(this.level).some(s=>overlap(swept,s))){b.life=0;if(b.kind==='venom')this.events.push('venom-impact');continue;}
      if(b.owner==='player') {
        for(const e of this.enemies)if(b.life>0&&e.alive&&e.active&&overlap(swept,enemyBox(e))){this.hitEnemy(e,2);b.life=0;}
      } else if(b.life>0&&overlap(swept,p.box)){this.damagePlayer(1,b.x);b.life=0;if(this.p!==p)return;this.events.push('venom-impact');}
    }
    this.projectiles=this.projectiles.filter(b=>b.life>0);
    if(overlap(p.box,this.level.exit)&&(!this.level.exit.requiresBoss||!this.boss?.alive)) {
      this.won=true;this.events.push('victory');
    }
  }
}
export const newGame=level=>new LevelSimulation(level);
export const step=(game,input,dt=STEP)=>game.update(input,dt);
