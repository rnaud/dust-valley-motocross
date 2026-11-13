import {evaluateResetFrontSuspension} from './reset-front-suspension-case.mjs';
import {updateMcmResetSuspension} from '../../src/physics/mcm/reset-suspension.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function resetSuspensionScratch(p){
 const l=p.frontLoad,m=p.frontMotion,t=p.frontTire,s=p.rearSuspension;
 // Avoid V8's first NaN store during an ordinary-array element transition.
 // These are observed float values; copying must preserve their sign bits.
 const result=new Float64Array(44);let i=0;
 const vector=v=>{for(const x of v)result[i++]=x;};
 vector(l.arm);vector(l.angularCross);vector(l.scratch354);vector(l.force);
 result[i++]=m.normalLoad;vector(m.tangent);result[i++]=m.alignment;result[i++]=m.forwardMagnitude;
 vector(m.linear);vector(m.combined);result[i++]=m.speed;result[i++]=t.alignment;
 result[i++]=t.perpendicular;result[i++]=t.magnitude;vector(t.force);vector(t.direction);
 vector(s.displacement);vector(s.suspensionVelocity);result[i++]=s.compression;result[i++]=s.travel;
 result[i++]=s.contactLimited;result[i++]=s.active;return result;
}
export function evaluateResetSuspension(input,step=updateMcmResetSuspension){
 let p;
 const words=evaluateResetFrontSuspension(input,c=>{const result=step(c);p=c.contactPhase;return result;});
 const scratch=resetSuspensionScratch(p);
 return [...words,...scratch.slice(0,42).map(floatBits),scratch[42]>>>0,scratch[43]>>>0];
}
