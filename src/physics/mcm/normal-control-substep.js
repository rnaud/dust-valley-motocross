import {updateMcmControllerHandoffSubstep} from './controller-handoff-substep.js';
import {updateMcmStateZeroControl} from './state-zero-control.js';

// Original 0x4abb30..0x4abef9, with gate exits at 0x4ac64a / 0x4ac1f7.
// The forward basis is read directly from the cached world matrix, without
// resolving it after the preceding node mutations.
export function updateMcmSubstepNormalControl(c){
 c.normalControl.redirected=0;
 if(c.state844)return;
 const s=c.normalControl,angularVelocity=new Float64Array(3);
 angularVelocity[0]=c.chassisResponse.angularXY[0];angularVelocity[1]=c.chassisResponse.angularXY[1];angularVelocity[2]=c.field53c;
 const r=updateMcmStateZeroControl({
  limitedFirst:c.frontSuspension.contactLimited,limitedSecond:c.rearSuspension.contactLimited,
  field4bc:c.field4bc,controlVector:s.vector,scratch540:c.offset,scratch54c:c.normal,
  velocity:c.velocity,speed:c.chassisImpulse.speed,angularVelocity,
  dt:c.dt,control:c.riderLean,field6f4:s.yaw,field820:s.flag820,field730:s.field730,
  field710:c.leanDisabled,field594:c.heights[1],fieldc68:s.flags,field5e4:c.brakeInput,
  field6fc:s.flag6fc,engineLevel:c.motionTransform.engineLevel,
  forward:c.nodes[s.forwardIndex].world.slice(8,11),
 });
 s.redirected=r.redirected?1:0;s.vector=r.controlVector;c.offset=r.scratch540;c.normal=r.scratch54c;
 c.velocity=r.velocity;c.chassisImpulse.speed=r.speed;
 c.chassisResponse.angularXY=r.angularVelocity.slice(0,2);c.field53c=r.angularVelocity[2];
}
export function updateMcmNormalControlSubstep(c){
 const r=updateMcmControllerHandoffSubstep(c);updateMcmSubstepNormalControl(c);return r;
}
