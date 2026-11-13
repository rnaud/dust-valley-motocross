import {evaluateResetLoopMotion} from './reset-loop-motion-case.mjs';
import {continueMcmResetLoopControls} from '../../src/physics/mcm/reset-loop-controls.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopControls(input,observe){
 let tail=Array(170).fill(0);
 const words=evaluateResetLoopMotion(input,(c,{looped})=>{
  if(!looped){observe?.(c,{looped});return;}
  const route=continueMcmResetLoopControls(c);tail=resetLoopControlsWords(c,route);
  observe?.(c,{looped});
 });return [...words,...tail];
}

export function resetLoopControlsWords(c,route) {
 let tail;
 const b=c.bike,p=c.contactPhase;
  tail=[route];
  for(const v of [b.velocity,b.angularVelocity,b.normal,b.offset])tail.push(...Array.from(v,floatBits));
  tail.push(floatBits(b.field6a4));
  for(const field of ['6b0','6a8','6ac','c6c','c70','c74','c78'])tail.push(['c6c','c78'].includes(field)?b[`field${field}`]>>>0:floatBits(b[`field${field}`]));
  for(const v of [c.rider.velocity,c.rider.angularVelocity,p.controllerHandoff.axis])tail.push(...Array.from(v,floatBits));
  tail.push(...Array.from(route===1?p.normalControl.vector:[0,0,0],floatBits),floatBits(route===1?p.normalRotation.angle:0),...Array.from(p.normalAlignment.local,floatBits));
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(p.normalControl.redirected);

 return tail;
}
