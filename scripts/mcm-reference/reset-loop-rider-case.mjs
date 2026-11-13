import {evaluateResetLoopEvent} from './reset-loop-event-case.mjs';
import {continueMcmResetLoopRider} from '../../src/physics/mcm/reset-loop-rider.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopRider(input,observe){
 let tail=Array(175).fill(0);
 const words=evaluateResetLoopEvent(input,(c,{looped})=>{
  if(!looped){observe?.(c,{looped});return;}
  continueMcmResetLoopRider(c);tail=resetLoopRiderWords(c);
  observe?.(c,{looped});
 });return [...words,...tail];
}

export function resetLoopRiderWords(c) {
 let tail;
 const b=c.bike,s=c.loopRider;
  tail=[];
  for(const field of ['820','710','b4c','814','818','730','708','704','724','728','72c','734'])tail.push(['820','710','b4c','814','724','72c'].includes(field)?b[`field${field}`]>>>0:floatBits(b[`field${field}`]));
  tail.push(...Array.from(c.effect,floatBits),...s.bikeAnimation.map(v=>v>>>0),...s.riderAnimation.map(v=>v>>>0));
  for(const v of [b.normal,b.offset,b.boundsMin,b.boundsMax])tail.push(...Array.from(v,floatBits));
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(s.queries.length,...[0,1,2].map(i=>s.queries[i]??0),(s.trickIndex+1)>>>0);

 return tail;
}
