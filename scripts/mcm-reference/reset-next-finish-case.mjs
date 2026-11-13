import {evaluateResetNextEvent} from './reset-next-event-case.mjs';
import {continueMcmResetLoopRider} from '../../src/physics/mcm/reset-loop-rider.js';
import {continueMcmResetLoopFinish} from '../../src/physics/mcm/reset-loop-finish.js';
import {resetLoopRiderWords} from './reset-loop-rider-case.mjs';
import {resetLoopFinishWords} from './reset-loop-finish-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextFinish(input,observe){
 let words=Array(684).fill(0),finishReached=false;
 const result=evaluateResetNextEvent(input,c=>{
  continueMcmResetLoopRider(c);const rider=resetLoopRiderWords(c),b=c.bike,s=c.loopRider;
  const nearby=[b.field824>>>0,floatBits(b.field82c),floatBits(b.field830),floatBits(b.field834),s.nearby===undefined?+!!b.field838:+!!s.nearby,...s.riderBounds.map(floatBits)];
  continueMcmResetLoopFinish(c);words=[...rider,...nearby,...resetLoopFinishWords(c)];finishReached=true;
  observe?.(c);
 });
 return {...result,tail:[...result.tail,...words],finishReached};
}
