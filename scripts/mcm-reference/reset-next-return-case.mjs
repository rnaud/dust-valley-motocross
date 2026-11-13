import {evaluateResetNextLoop} from './reset-next-loop-case.mjs';
import {beginMcmPostLoop,updateMcmFrameAcceleration} from '../../src/physics/mcm/frame-acceleration-filter.js';
import {updateMcmRetainedFrameRider} from '../../src/physics/mcm/retained-frame-rider.js';
import {finishMcmFrame} from '../../src/physics/mcm/frame-return.js';
import {frameRiderEntryWords} from './frame-rider-entry-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextReturn(input,observe){
 let words=Array(11244).fill(0),returned=false,returnBranch='not-reached';
 const result=evaluateResetNextLoop(input,c=>{
  const b=c.bike,e=c.frameEntry;
  const before=[floatBits(b.field854),floatBits(c.frameTail.filter.value),floatBits(b.field850),b.field8c0>>>0];
  c.frameTail.frameDelta=e.storedInterval;
  beginMcmPostLoop(c);const filtered=updateMcmFrameAcceleration(c);
  words=[b.field8c0>>>0,...Array.from(b.offset,floatBits),floatBits(filtered.acceleration),floatBits(b.field850),floatBits(b.field854),floatBits(c.frameTail.filter.value),floatBits(c.frameTail.filter.duration),floatBits(e.storedInterval),0];
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  words.push(...before);
  returnBranch=b.field844?'crash':b.field710?((b.field814<<24)>>24)<0?'nearby':'trick':b.fieldbfc===2?'recovery':'normal';
  const rider=updateMcmRetainedFrameRider(c,e.rawDelta),a=c.frameRider;
  const riderWords=frameRiderEntryWords(c);riderWords[55]=floatBits(a.riderAnimation.remainder);
  for(const n of c.bounds.components)riderWords.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  for(const o of [a.bikeAnimation,a.riderAnimation])riderWords.push(o.displayedFrame.index>>>0,o.previousFrame.index>>>0,floatBits(o.blendTime),floatBits(o.blendDuration));
  riderWords.push(rider.queries.length,rider.queries[0]??0,rider.queries[1]??0);
  for(const child of [...a.allChildren,...c.bounds.children])riderWords.push(...[child.forward,child.up,child.position].flatMap(v=>Array.from(v,floatBits)));
  words.push(...riderWords);
  const prior=[...Array.from(b.savedPosition,floatBits),...Array.from(b.position,floatBits)];
  finishMcmFrame(c);words.push(b.field568,...Array.from(b.savedPosition,floatBits));
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  words.push(...prior,1);returned=true;observe?.(c);
 });
 if(returned)words[10]=result.loopCount;
 return {...result,tail:[...result.tail,...words],returned,returnBranch};
}
