import {evaluateResetTireForces} from './reset-tire-forces-case.mjs';
import {updateMcmResetChassisImpulse} from '../../src/physics/mcm/reset-chassis-impulse.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function resetImpulseScratch(p){
 const s=p.chassisContact;
 return [s.absTurn,...s.coefficients,...s.arm,...s.normal,...s.velocity,s.count,...p.chassisResponse.scratch,p.chassisImpulse.squaredSpeed,p.frontLoad.turnAngle];
}
export function evaluateResetChassisImpulse(input,step=updateMcmResetChassisImpulse){
 let p;
 const words=evaluateResetTireForces(input,c=>{const result=step(c);p=c.contactPhase;return result;});
 const s=p.chassisContact;
 return [...words,floatBits(s.absTurn),...s.coefficients.map(floatBits),...s.arm.map(floatBits),...s.normal.map(floatBits),...s.velocity.map(floatBits),
  s.count>>>0,s.enabled>>>0,...p.chassisResponse.scratch.map(floatBits),floatBits(p.chassisImpulse.squaredSpeed)];
}
