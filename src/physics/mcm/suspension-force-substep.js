import {floatBits} from './math.js';
import {calculateMcmSuspensionForces} from './suspension-forces.js';
import {updateMcmChassisImpulseSubstep} from './chassis-impulse-substep.js';
const signed=v=>floatBits(v)|0;

// Original 0x4a9b29..0x4a9d5c, with crashed contact response branching to
// 0x4ab426. Suspension forces use travel, not residual compression.
export function prepareMcmSuspensionForces(c){
 if(c.state844&&c.chassisContact.enabled)return;
 const s=c.suspensionForces;
 if(!c.anyContact){
  c.frontLoad.localArm=[...c.localBalanceCenter];
  c.frontSuspension.previousDisplacement=[0,0,0];c.frontSuspension.previousTravel=0;c.rearSuspension.previousTravel=0;
  s.front.force=[0,0,0];s.rear.force=[0,0,0];return;
 }
 if(c.bothContact&&!c.state844&&signed(c.speed)<0x3e99999a){
  const up=c.bikeForward[1],tangent=c.rearTangent[1];
  if(up>tangent&&signed(c.rearAlignment)<0x3f7fd817){
   if(floatBits(c.riderLean)>0x80000000)c.chassisResponse.angularXY[0]=0;
  }else if(!(up>=tangent)&&signed(c.rearAlignment)<0x3f7ff60a&&signed(c.riderLean)>0)c.chassisResponse.angularXY[0]=0;
 }
 const result=calculateMcmSuspensionForces({mass:c.mass,extraStiffness:s.extraStiffness,
  first:{...s.front,...c.frontSuspension,massShare:c.rearWeight},
  second:{...s.rear,...c.rearSuspension,velocity:c.rearSuspension.suspensionVelocity,massShare:c.frontWeight}});
 Object.assign(s.front,result.first);Object.assign(s.rear,result.second);
}
export function updateMcmSuspensionForceSubstep(c){
 const result=updateMcmChassisImpulseSubstep(c);prepareMcmSuspensionForces(c);return result;
}
