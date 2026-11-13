import {evaluateResetLoopResponse} from './reset-loop-response-case.mjs';
import {continueMcmResetLoopTireForces} from '../../src/physics/mcm/reset-loop-tire-forces.js';
import {resetSuspensionScratch} from './reset-suspension-case.mjs';
import {resetTireScratch} from './reset-tire-forces-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopTireForces(input,observe){
 let state,continued=false,tail=Array(332).fill(0);
 const words=evaluateResetLoopResponse(input,(c,{looped})=>{
  state=c;continued=looped;if(!looped)return;
  continueMcmResetLoopTireForces(c);tail=resetLoopTireForcesWords(c);

 });const output=[...words,...tail];observe?.(state,{looped:continued});return output;
}

export function resetLoopTireForcesWords(c) {
 let tail;
 const b=c.bike,p=c.contactPhase,s=p.frontSuspension;
  tail=[floatBits(p.balanceFilter[0]),...Array.from(p.balanceScratch,floatBits),...Array.from(p.balanceGeometryScratch,floatBits),...Array.from(s.displacement,floatBits),...Array.from(s.velocity,floatBits),floatBits(s.compression),floatBits(s.travel),s.contactLimited>>>0,s.active>>>0];
  const scratch=resetSuspensionScratch(p);tail.push(...scratch.slice(0,42).map(floatBits),scratch[42]>>>0,scratch[43]>>>0,...resetTireScratch(p).map(floatBits));
  for(const field of ['4bc','870','5a8','5ac','6b0','6b4','560','620','73c','738'])tail.push(['4bc','870','620'].includes(field)?b[`field${field}`]>>>0:floatBits(b[`field${field}`]));
  for(const v of [b.referencePosition,p.takeoffPosition,p.takeoffVelocity,p.localBalanceCenter,b.localLever,b.offset,b.velocity,c.heights,c.component8e4.value])tail.push(...Array.from(v,floatBits));
  tail.push(floatBits(c.component8e4.field5c),c.suspension.front.limited>>>0,floatBits(c.component8e8.field58),c.suspension.rear.limited>>>0);
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(...c.points.flatMap(v=>Array.from(v,floatBits)));
 return tail;
}
