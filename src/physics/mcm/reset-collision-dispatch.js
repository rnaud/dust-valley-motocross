import {updateMcmResetCollisionSync} from './reset-collision-sync.js';
import {dispatchMcmCollisionState} from './collision-substep.js';
import {primaryMcmCollision} from './collision-callback.js';
import {applyMcmSubstepEventDecision} from './normal-event-decision-substep.js';
import {commitMcmResetEventDecision} from './reset-event-decision.js';
import {setupMcmResetEvent} from './reset-event-setup.js';

// Connected reset path through the real static-wall dispatcher at 0x4ac89e.
export function updateMcmResetCollisionDispatch(c){
 const result=updateMcmResetCollisionSync(c),b=c.bike,p=c.contactPhase,d=c.dispatch;
 const randomBefore=p.normalEventDecision.randomCalls;
 const bike={transform:c.bodyNode,field8a8:b.field8a8,field618:b.field618,field8ac:b.field8ac,
  carry:b.field8c8,field564:b.field564,field8d0:b.field8d0,inverseMass:b.inverseMass,
  restitution:b.field5e0,inverseInertia:[b.field5f0,b.field5f4,b.field5f8],alternateInertia:[b.field5fc,b.field600,b.field604]};
 const fromState=()=>Object.assign(bike,{position:b.position,velocity:b.velocity,angularVelocity:b.angularVelocity,
  worldAngularVelocity:b.worldAngularVelocity,speed:b.field6a4,state844:b.field844,scratch540:b.offset,field654:b.localLever});
 const toState=()=>{
  b.position=p.bodyPosition=bike.position;b.velocity=p.velocity=bike.velocity;b.angularVelocity=bike.angularVelocity;
  p.chassisResponse.angularXY=bike.angularVelocity.slice(0,2);p.field53c=bike.angularVelocity[2];
  b.worldAngularVelocity=p.angularVelocity=bike.worldAngularVelocity;b.field6a4=p.chassisImpulse.speed=bike.speed;
  b.field844=p.state844=bike.state844;b.offset=p.offset=bike.scratch540;b.localLever=p.frontLoad.localArm=bike.field654;
 };
 fromState();d.priorKind=c.collision?b.field8b8>>>0:0xffffffff;d.priorAngularX=c.collision?b.angularVelocity[0]:0;d.callbackCount=0;d.priorState=c.collision?b.field844>>>0:0xffffffff;
 if(c.collision)c.collision.onPrimary=()=>{
  d.callbackCount++;
  primaryMcmCollision({bike,collision:c.collision,collisionType:2,proxy:c.proxy,grid:c.grid,gridEnabled:c.gridEnabled,
   onEvent(){toState();applyMcmSubstepEventDecision(p,{arg1:0,arg2:0,arg7:1,arg8:b.field8d0,arg9:0,arg11:0});
    commitMcmResetEventDecision(c);setupMcmResetEvent(c);fromState();}
  });
 };
 const step={bike,collision:c.collision,manager:d.manager,remaining:p.control20};
 dispatchMcmCollisionState(step);toState();
 b.field8a8=bike.field8a8;b.field8c8=p.normalEventJoin.delay=bike.carry;p.control20=p.normalEventJoin.flag=step.remaining;
 return {...result,randomCalls:result.randomCalls+p.normalEventDecision.randomCalls-randomBefore};
}
