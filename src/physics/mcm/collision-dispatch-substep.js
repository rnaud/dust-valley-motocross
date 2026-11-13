import {updateMcmCollisionSyncSubstep} from './collision-sync-substep.js';
import {dispatchMcmCollisionState} from './collision-substep.js';
import {primaryMcmCollision} from './collision-callback.js';
import {applyMcmSubstepEventDecision} from './normal-event-decision-substep.js';
import {applyMcmSubstepEventSetup} from './normal-event-setup-substep.js';

// Continuous prefix through collision dispatch at 0x4ac89e.
export function updateMcmCollisionDispatchSubstep(c){
 const result=updateMcmCollisionSyncSubstep(c),s=c.collisionSync,d=c.collisionDispatch;
 const a=c.chassisResponse,i=c.chassisImpulse;
 const bike={transform:c.bodyNode,field8a8:d.skip,field618:c.normalRider.secondaryControl,field8ac:c.cooldownFlag,
  carry:c.normalEventJoin.delay,field564:c.speed,field8d0:c.postState.lastDt,inverseMass:c.traction.inverseMass,restitution:i.restitution,
  inverseInertia:[a.normalCoefficients[0],i.normalY,a.normalCoefficients[1]],alternateInertia:[a.crashCoefficients[0],i.crashY,a.crashCoefficients[1]],field654:c.frontLoad.localArm};
 const fromState=()=>{Object.assign(bike,{position:c.bodyPosition,velocity:c.velocity,worldAngularVelocity:c.angularVelocity,speed:i.speed,state844:c.state844,scratch540:c.offset});bike.angularVelocity=new Float64Array([a.angularXY[0],a.angularXY[1],c.field53c]);};
 const toState=()=>{c.bodyPosition=bike.position;c.velocity=bike.velocity;c.angularVelocity=bike.worldAngularVelocity;i.speed=bike.speed;c.state844=bike.state844;c.offset=bike.scratch540;a.angularXY=bike.angularVelocity.slice(0,2);c.field53c=bike.angularVelocity[2];c.frontLoad.localArm=bike.field654;};
 fromState();d.callbackCount=0;d.priorState=s.present?c.state844>>>0:0xffffffff;
 s.object.onPrimary=()=>{d.callbackCount++;primaryMcmCollision({bike,collision:s.object,collisionType:2,proxy:s.proxy,grid:s.grid,gridEnabled:s.gridEnabled,onEvent:()=>{
  toState();applyMcmSubstepEventDecision(c,{arg1:0,arg2:0,arg7:1,arg8:c.postState.lastDt,arg9:0,arg11:0});applyMcmSubstepEventSetup(c);fromState();
 }});};
 const step={bike,collision:s.present?s.object:null,manager:d.manager,remaining:c.control20};
 dispatchMcmCollisionState(step);toState();d.skip=bike.field8a8;c.control20=step.remaining;c.normalEventJoin.flag=step.remaining;c.normalEventJoin.delay=bike.carry;
 return result;
}
