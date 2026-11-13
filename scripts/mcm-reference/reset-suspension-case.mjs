import {evaluateResetFrontSuspension} from './reset-front-suspension-case.mjs';
import {updateMcmResetSuspension} from '../../src/physics/mcm/reset-suspension.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function resetSuspensionScratch(p){
 const l=p.frontLoad,m=p.frontMotion,t=p.frontTire,s=p.rearSuspension;
 return [...l.arm,...l.angularCross,...l.scratch354,...l.force,m.normalLoad,...m.tangent,m.alignment,m.forwardMagnitude,
  ...m.linear,...m.combined,m.speed,t.alignment,t.perpendicular,t.magnitude,...t.force,...t.direction,
  ...s.displacement,...s.suspensionVelocity,s.compression,s.travel,s.contactLimited,s.active];
}
export function evaluateResetSuspension(input){
 let p;
 const words=evaluateResetFrontSuspension(input,c=>{const result=updateMcmResetSuspension(c);p=c.contactPhase;return result;});
 const scratch=resetSuspensionScratch(p);
 return [...words,...scratch.slice(0,42).map(floatBits),scratch[42]>>>0,scratch[43]>>>0];
}
