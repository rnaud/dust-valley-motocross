import {updateMcmNormalAlignmentSubstep} from './normal-alignment-substep.js';
import {decideMcmBikeEvent} from './event-decision.js';

// Original normal branches call 0x4a4b60, then its decision callee 0x4a4d70.
// This boundary stops before the caller commits state and sets up the rider.
export function updateMcmNormalEventDecisionSubstep(c){
 const result=updateMcmNormalAlignmentSubstep(c),s=c.normalEventDecision;
 s.triggered=0;s.randomCalls=0;s.inputCalls=0;s.otherPresent=+(c.controllerHandoff.other!==0);
 if(c.state844)return result;
 applyMcmSubstepEventDecision(c);
 return result;
}
export function applyMcmSubstepEventDecision(c,args={}){
 const s=c.normalEventDecision;
 const angularVelocity=new Float64Array(3);
 angularVelocity[0]=c.chassisResponse.angularXY[0];angularVelocity[1]=c.chassisResponse.angularXY[1];angularVelocity[2]=c.field53c;
 const r=decideMcmBikeEvent({...s,reason:c.controllerHandoff.kind,field710:c.leanDisabled,field714:c.field714,
  position:c.bodyPosition,velocity:c.velocity,angularVelocity,up:c.bikeUp,
  speed:c.chassisImpulse.speed,previousSpeed:c.speed,
  otherVelocity:c.controllerHandoff.other===2?c.velocity:c.controllerHandoff.otherVelocity,
  otherSpeed:c.controllerHandoff.other===2?c.chassisImpulse.speed:s.otherSpeed,
  field4bc:c.field4bc,state:c.state844,height0:c.heights[0],height1:c.heights[1],suppress:c.cooldownFlag,
  counter:c.singleContactForce.counter,field820:c.normalControl.flag820,
  angle4d8:c.roll,angle4f0:c.targetRoll,time:c.linearIntegration.field8cc,invMass:c.traction.inverseMass,
  arg1:c.frontContact,arg2:c.rearContact,arg7:c.rearAlignment,arg8:c.dt,arg9:0,arg11:0,...args,
 });
 Object.assign(s,{triggered:r.triggered,eventKind:r.eventKind,otherPresent:r.otherPresent,randomCalls:s.randomCalls+r.randomCalls,inputCalls:s.inputCalls+r.inputCalls});
 c.controllerHandoff.kind=r.reason;c.leanDisabled=r.field710;c.field714=r.field714;
 c.velocity=r.velocity;c.chassisResponse.angularXY=r.angularVelocity.slice(0,2);c.field53c=r.angularVelocity[2];
 return r;
}
