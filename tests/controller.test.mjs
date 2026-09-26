import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerController, FEEL, BODY} from '../player-controller.mjs';
const floor = {surfaces:[{x:-1000,y:300,w:4000,h:100,kind:'solid'}],walls:[]};
const tick=(p,input={},n=1,level=floor)=>{for(let k=0;k<n;k++)p.update(input,level,1/120);};
const player=()=>new PlayerController({x:100,y:300,face:1});
export function measureJump(heldFrames=120){
  const p=player(); tick(p); const start=p.y; let apex=p.y,apexTime=0,airtime=0;
  for(let n=0;n<240;n++){
    tick(p,{jumpPressed:n===0,jump:n<heldFrames});
    if(p.y<apex){apex=p.y;apexTime=(n+1)/120;}
    if(n>0&&p.on){airtime=(n+1)/120;break;}
  }
  return {height:start-apex,apexTime,airtime};
}
test('full jump and early-release short hop are snappy and distinct',()=>{
  const full=measureJump(),short=measureJump(3);
  assert(full.height>62&&full.height<80);assert(full.airtime>.5&&full.airtime<.75);
  assert(short.height>15&&short.height<32);assert(short.height<full.height*.5);
});
test('dash travels 152px, cannot start airborne, may carry off ledge',()=>{
  const p=player(); tick(p);const x=p.x;tick(p,{dashPressed:true},1);tick(p,{},23);
  assert(Math.abs(p.x-x-152)<.1);assert.equal(p.dash,0);
  tick(p,{jumpPressed:true,jump:true});p.dashCD=0;tick(p,{dashPressed:true,jump:true});assert.equal(p.dash,0);
  const q=player();tick(q);q.x=590;tick(q,{dashPressed:true},24,{surfaces:[{x:0,y:300,w:600,h:50,kind:'solid'}],walls:[]});
  assert(q.x>700);assert(!q.on);
});
test('coyote grace is consumed; only one double flip',()=>{
  const p=player();tick(p);p.x=3100;tick(p,{},6);tick(p,{jumpPressed:true,jump:true});
  assert(p.vy<-400);assert.equal(p.airJumps,1);assert.equal(p.coyote,0);
  tick(p,{jumpPressed:true,jump:true});assert.equal(p.airJumps,0);assert(p.flip>0);
  const vy=p.vy;tick(p,{jumpPressed:true,jump:true});assert(p.vy>vy);
});
test('jump buffer survives landing and does not re-trigger',()=>{
  const p=player();p.y=295;p.on=false;p.airJumps=0;p.vy=150;
  tick(p,{jumpPressed:true,jump:true});tick(p,{jump:true},6);assert(p.vy<0);assert(!p.on);assert.equal(p.buffer,0);
  tick(p,{jump:true},100);assert(p.on);
});
test('wall contact, climb, kick lock and opposite wall regrab',()=>{
  const level={surfaces:[],walls:[{x:200,y:0,w:20,h:500,climbable:true},{x:100,y:0,w:20,h:500,climbable:true}]};
  const p=new PlayerController({x:191,y:260,face:1});tick(p,{right:true,climb:true},5,level);
  assert.equal(p.wall,1);assert(p.y<260);const y=p.y;
  tick(p,{jumpPressed:true,jump:true,right:true},1,level);assert(p.vx<-270);assert(p.vy<-390);
  tick(p,{jump:true,right:true},15,level);assert(p.x<160);assert(p.y<y-35);
  tick(p,{left:true,jump:true},24,level);assert.equal(p.wall,-1);
});
test('fixed hurt body is pose independent and ceiling stops rise',()=>{
  const p=player();assert.deepEqual(BODY,{w:18,h:42});tick(p);
  const level={...floor,surfaces:[...floor.surfaces,{x:0,y:210,w:300,h:10,kind:'solid'}]};
  tick(p,{jumpPressed:true,jump:true},1,level);tick(p,{jump:true},30,level);assert(p.y>=262);
});
