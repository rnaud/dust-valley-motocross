import {evaluateResetLoopCompletion} from './reset-loop-completion-case.mjs';
import {beginMcmPostLoop,updateMcmFrameAcceleration} from '../../src/physics/mcm/frame-acceleration-filter.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function evaluateResetPostFilter(input){
 let tail;
 const words=evaluateResetLoopCompletion(input,c=>{
  const b=c.bike;
  c.frameTail=structuredClone(input.frameTail);
  const before=[floatBits(b.field854),floatBits(c.frameTail.filter.value),floatBits(b.field850),b.field8c0>>>0];
  beginMcmPostLoop(c);
  const result=updateMcmFrameAcceleration(c);
  tail=[b.field8c0>>>0,...Array.from(b.offset,floatBits),floatBits(result.acceleration),floatBits(b.field850),floatBits(b.field854),floatBits(c.frameTail.filter.value),floatBits(c.frameTail.filter.duration),floatBits(c.frameTail.frameDelta),0];
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(...before);
 });
 tail[10]=1+words[1937]+words[3994]+words[6062];
 return [...words,...tail];
}
