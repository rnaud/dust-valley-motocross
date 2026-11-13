import {evaluateResetPostFilter} from './reset-post-filter-case.mjs';
import {frameRiderEntryWords} from './frame-rider-entry-case.mjs';
import {updateMcmRetainedFrameRider} from '../../src/physics/mcm/retained-frame-rider.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetFrameRider(input,observe){
 let tail,branch,entry;
 const prefix=evaluateResetPostFilter(input,c=>{
  const b=c.bike;branch=b.field844?'crash':b.field710?((b.field814<<24)>>24)<0?'nearby':'trick':b.fieldbfc===2?'recovery':'normal';
  entry={riderStopped:c.frameRider.riderAnimation.stopped};
  const result=updateMcmRetainedFrameRider(c,input.frameRider.rawDelta),a=c.frameRider;
  tail=frameRiderEntryWords(c);tail[55]=floatBits(a.riderAnimation.remainder);
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  for(const o of [a.bikeAnimation,a.riderAnimation])tail.push(o.displayedFrame.index>>>0,o.previousFrame.index>>>0,floatBits(o.blendTime),floatBits(o.blendDuration));
  tail.push(result.queries.length,result.queries[0]??0,result.queries[1]??0);
  for(const child of [...a.allChildren,...c.bounds.children])tail.push(...[child.forward,child.up,child.position].flatMap(v=>Array.from(v,floatBits)));
  if(observe)observe(c);
 });
 return {prefix,tail,branch,entry};
}
