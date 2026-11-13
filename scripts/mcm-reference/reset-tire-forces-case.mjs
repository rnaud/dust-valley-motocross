import {evaluateResetSuspension} from './reset-suspension-case.mjs';
import {updateMcmResetTireForces} from '../../src/physics/mcm/reset-tire-forces.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function resetTireScratch(p){
 const l=p.rearLoad,m=p.rearMotion,t=p.traction.tire,a=p.brakes.front,b=p.brakes.rear;
 return [p.driveScalar,...l.arm,...l.angularCross,...l.force,m.normalLoad,...m.tangent,m.alignment,...m.combined,m.speed,m.forwardMagnitude,...m.direction,
  ...p.traction.scratch,t.alignment,t.perpendicular,t.magnitude,...t.force,...p.totalTorque,...p.combinedTireForce,p.combinedTireMagnitude,
  a.magnitude,a.requested,...a.force,b.magnitude,b.requested,...b.force];
}
export function evaluateResetTireForces(input,step=updateMcmResetTireForces){
 let p;
 const words=evaluateResetSuspension(input,c=>{const result=step(c);p=c.contactPhase;return result;});
 return [...words,...resetTireScratch(p).map(floatBits)];
}
