import {evaluateResetLoopTireForces} from './reset-loop-tire-forces-case.mjs';
import {continueMcmResetLoopMotion} from '../../src/physics/mcm/reset-loop-motion.js';
import {resetIntegrationWords} from './reset-linear-integration-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopMotion(input,observe){
 let tail=Array(273).fill(0);
 const words=evaluateResetLoopTireForces(input,(c,{looped})=>{
  if(!looped){observe?.(c,{looped});return;}
  continueMcmResetLoopMotion(c);const b=c.bike,p=c.contactPhase,s=p.chassisContact;
  tail=[floatBits(s.absTurn),...Array.from(s.coefficients,floatBits),...Array.from(s.arm,floatBits),...Array.from(s.normal,floatBits),...Array.from(s.velocity,floatBits),s.count>>>0,s.enabled>>>0,...Array.from(p.chassisResponse.scratch,floatBits),floatBits(p.chassisImpulse.squaredSpeed)];
  tail.push(...resetIntegrationWords(p));
  tail.push(floatBits(p.motionTransform.signedDt),floatBits(p.motionTransform.rearDelta),floatBits(p.motionTransform.angle));
  for(const v of [b.position,b.referencePosition,b.velocity,b.acceleration,b.angularVelocity,b.worldAngularVelocity,b.localLever,b.normal,b.offset,p.chassisResponse.localLever])tail.push(...Array.from(v,floatBits));
  for(const field of ['844','6a4','8bc','6ac','6d8','6dc','6e0'])tail.push(['844','8bc','6e0'].includes(field)?b[`field${field}`]>>>0:floatBits(b[`field${field}`]));
  tail.push(floatBits(c.front.limited),floatBits(c.rear.limited));
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(...Array.from(p.force,floatBits),...Array.from(p.totalTorque,floatBits),...Array.from(c.component8e4.value,floatBits),floatBits(c.component8e4.field5c),floatBits(c.component8e8.field58));
  observe?.(c,{looped});
 });return [...words,...tail];
}
