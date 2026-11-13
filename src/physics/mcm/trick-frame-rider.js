import {floatBits} from './math.js';
import {advanceMcmAnimation} from './animation-advance.js';
const f=Math.fround;
// Pinned original table at 0x4ea5a0, stride 16.
export const mcmTrickHoldFrames=Object.freeze([24,15,17,10,25,15,22,10,15,10,11,13,20,22,24,14]);

// Original 0x4af7cf..0x4af8fb when field710 != 0 and signed byte +814 >= 0.
// The input adapter supplies the original bike query; animation objects and
// callbacks are live and retain mutations between frame calls.
export function updateMcmTrickFrameRider(c,delta){
 const {bike:b,bikeAnimation,riderAnimation}=c;
 let held=false;
 if(!b.ai&&!b.secondaryControl)held=!!(c.query(6)||c.query(7));
 b.elapsed=f(b.elapsed+delta);
 if(held||(floatBits(b.holdTime)&0x7fffffff)){
  const first=mcmTrickHoldFrames[b.animation],frame=bikeAnimation.frame.index;
  if(first<frame&&frame<first+3){
   if(b.ai){
    b.holdTime=f(b.holdTime-delta);
    if(floatBits(b.holdTime)>0x80000000)b.holdTime=0;
   }
   return;
  }
 }
 advanceMcmAnimation(riderAnimation,delta,c.applyRider);
 advanceMcmAnimation(bikeAnimation,delta,c.applyBike);
}
