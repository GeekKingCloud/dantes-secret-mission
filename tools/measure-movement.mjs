// Real fixed-step trajectories on diagnostic geometry; no campaign data changes.
import assert from 'node:assert/strict';
import {PlayerController,FEEL} from '../player-controller.mjs';
import {STEP} from '../simulation.mjs';
const floor={surfaces:[{x:-1000,y:300,w:4000,h:100,kind:'solid'}],walls:[]};
const tick=(p,input={},level=floor)=>p.update(input,level,STEP);
function jump(heldSteps){
  const p=new PlayerController({x:100,y:300,face:1});tick(p);
  let minY=p.y,apexStep=0,landingStep=0;
  for(let step=1;step<=240;step++){
    tick(p,{jumpPressed:step===1,jump:step<=heldSteps});
    if(p.y<minY){minY=p.y;apexStep=step;}
    if(step>1&&p.on){landingStep=step;break;}
  }
  assert(landingStep>0,'jump must land on the same floor');
  return {heldSteps,heightPx:300-minY,apexSteps:apexStep,apexSeconds:apexStep*STEP,airtimeSteps:landingStep,airtimeSeconds:landingStep*STEP};
}
function dash(){
  const p=new PlayerController({x:100,y:300,face:1});tick(p);const x=p.x;
  let steps=0;
  do{tick(p,{dashPressed:steps===0});steps++;assert(steps<100);}while(p.dash>0);
  const dashDistance=p.x-x,endVelocity=p.vx;
  let stopSteps=0;while(Math.abs(p.vx)>0){tick(p);stopSteps++;assert(stopSteps<100);}
  assert(Math.abs(dashDistance-152)<1e-6);
  return {activeSteps:steps,activeSeconds:steps*STEP,distancePx:dashDistance,endVelocityPxS:endVelocity,
    releaseBrakingSteps:stopSteps,releaseBrakingSeconds:stopSteps*STEP,totalDistanceThroughRestPx:p.x-x};
}
function wall(){
  const level={surfaces:[],walls:[{x:200,y:-500,w:20,h:1500,climbable:true},{x:100,y:-500,w:20,h:1500,climbable:true}]};
  const p=new PlayerController({x:191,y:260,face:1});
  for(let n=0;n<5;n++)tick(p,{right:true,climb:true},level);
  assert.equal(p.wall,1);const x=p.x,y=p.y;
  tick(p,{jumpPressed:true,jump:true,right:true},level);
  const firstStep={vxPxS:p.vx,vyPxS:p.vy,awayPx:x-p.x,risePx:y-p.y};
  for(let n=1;n<16;n++)tick(p,{jump:true,right:true},level);
  const forcedSeparation={steps:16,seconds:16*STEP,awayPx:x-p.x,risePx:y-p.y,vxPxS:p.vx,remainingLockSeconds:p.kick};
  let regrabSteps=16;
  while(p.wall!==-1&&regrabSteps<120){tick(p,{left:true,jump:true},level);regrabSteps++;}
  assert.equal(p.wall,-1,'opposite wall regrab');
  return {firstStep,forcedSeparation,oppositeRegrab:{steps:regrabSteps,seconds:regrabSteps*STEP,awayPx:x-p.x,risePx:y-p.y}};
}
const report={units:{position:'logical pixels',time:'seconds',velocity:'px/s'},fixedStepSeconds:STEP,
  method:'Sample after each actual PlayerController.update; jump landing is first grounded step; short hop releases on step 4. Wall starts after five climb steps; hold toward departure wall for 16 kick steps, then steer to opposite wall.',
  constants:FEEL,fullJump:jump(120),shortHop:jump(3),dash:dash(),wallKick:wall()};
console.log(JSON.stringify(report,null,2));
