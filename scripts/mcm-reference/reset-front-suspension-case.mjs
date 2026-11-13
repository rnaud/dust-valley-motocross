import {evaluateResetContactResponse} from './reset-contact-response-case.mjs';
import {updateMcmResetFrontSuspension} from '../../src/physics/mcm/reset-front-suspension.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function evaluateResetFrontSuspension(input,step=updateMcmResetFrontSuspension){
 let p;
 const words=evaluateResetContactResponse(input,c=>{const result=step(c);p=c.contactPhase;return result;});
 const s=p.frontSuspension;
 return [...words,floatBits(p.balanceFilter[0]),...p.balanceScratch.map(floatBits),...p.balanceGeometryScratch.map(floatBits),
  ...s.displacement.map(floatBits),...s.velocity.map(floatBits),floatBits(s.compression),floatBits(s.travel),s.contactLimited>>>0,s.active>>>0];
}
