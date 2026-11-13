import {floatBits} from './math.js';
import {seekMcmAnimation} from './animation-seek.js';

// Crash-state branch of 0x4af710, through its return at 0x4af7cc.
// The caller selects this branch when bike+0x844 is nonzero. The angle is
// component+0x44; object and record are the live bike animation state/assets.
export function updateMcmCrashFrameAnimation(bike,angle,object,record,applyChild){
 if(!bike.secondaryControl){
  const sign=floatBits(angle)>0x80000000?-1:1;
  const scaled=Math.abs(angle*1.2732394933700562);
  let weight=Math.fround(scaled);
  // x87 C0 comparison followed by a signed integer test of the stored float.
  if(scaled>=1)weight=1;
  if((floatBits(weight)|0)<=0)weight=0;
  bike.field730=Math.fround(weight*sign*.5+.5);
 }
 seekMcmAnimation(object,record,bike.field730,applyChild);
}
