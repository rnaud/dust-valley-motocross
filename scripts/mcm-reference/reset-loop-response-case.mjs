import {evaluateResetLoopContact} from './reset-loop-contact-case.mjs';
import {continueMcmResetLoopResponse} from '../../src/physics/mcm/reset-loop-response.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopResponse(input){
 let tail=Array(202).fill(0);
 const words=evaluateResetLoopContact(input,(c,result)=>{
  if(!result.looped)return;
  continueMcmResetLoopResponse(c);const b=c.bike,p=c.contactPhase;
  tail=[p.frontContact,p.rearContact,p.bothContact,p.anyContact,floatBits(p.speedCopy),...Array.from(p.force,floatBits),floatBits(p.rearAlignment),...Array.from(p.contactDirection,floatBits),...Array.from(p.rearLever,floatBits),...Array.from(p.frontAxis,floatBits),...Array.from(p.frontLever,floatBits),...p.chassisWorld.flatMap(v=>Array.from(v,floatBits)),...p.chassisSurface.flatMap(v=>Array.from(v,floatBits)),...p.chassisNormals.flatMap(v=>Array.from(v,floatBits)),...Array.from(p.chassisDepth,floatBits),p.control20];
  const integers=new Set(['4bc','870','8c4','b4c','c6c','714','c78']);
  for(const field of ['894','4f0','4f4','4bc','870','718','8c4','b4c','c6c','714','c78','c70','c74'])tail.push(integers.has(field)?b[`field${field}`]>>>0:floatBits(b[`field${field}`]));
  tail.push(floatBits(b.angularVelocity[2]),c.control1c>>>0,c.control30>>>0,c.control2c>>>0,floatBits(p.componentRate),...Array.from(p.responseScratch,floatBits),...Array.from(b.normal,floatBits),...Array.from(b.offset,floatBits));
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
 });
 return [...words,...tail];
}
