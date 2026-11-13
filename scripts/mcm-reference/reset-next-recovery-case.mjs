import {evaluateResetNextEntry} from './reset-next-entry-case.mjs';
import {recoverMcmFrameEntry} from '../../src/physics/mcm/frame-recovery-entry.js';
import {frameRiderEntryWords} from './frame-rider-entry-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextRecovery(input){
 let words,recoveryBranch;
 const result=evaluateResetNextEntry(input,c=>{
  const b=c.bike,a=c.frameRider,before=[b.fieldbfc>>>0,b.field820>>>0];
  recoveryBranch=recoverMcmFrameEntry(c,input.selection[0]);
  const tokens=o=>[o.stopped,o.record?.token??0,o.frame.token,o.field30,o.blending];
  c.loopRider.bikeAnimation=tokens(a.bikeAnimation);c.loopRider.riderAnimation=tokens(a.riderAnimation);
  words=frameRiderEntryWords(c);words[55]=floatBits(a.riderAnimation.remainder);
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  for(const o of [a.bikeAnimation,a.riderAnimation])words.push(o.displayedFrame.index>>>0,o.previousFrame.index>>>0,floatBits(o.blendTime),floatBits(o.blendDuration));
  for(const child of c.bounds.children)words.push(...[child.forward,child.up,child.position].flatMap(v=>Array.from(v,floatBits)));
  words.push(...before,floatBits(b.fieldbf8),input.selection[0]>>>0,c.frameEntry.control28);
 });
 return {...result,tail:[...result.tail,...words],recoveryBranch};
}
