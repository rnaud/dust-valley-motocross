import {floatBits} from './math.js';
import {extractMcmOrientationAngles} from './orientation-angles.js';

// Original 0x4ac89e..0x4ac94b, after collision/proxy synchronization.
export function finishMcmSubstep(c){
 let remaining=(c.remaining-1)|0,carry=c.carry,dt=c.dt,inverseDt=c.inverseDt;
 if(remaining===0&&(floatBits(carry)|0)>0x38d1b717){
  remaining=1;dt=carry;carry=0;inverseDt=Math.fround(1/dt);
 }
 const forward=c.local.slice(8,11),up=c.local.slice(4,7);
 return {remaining,carry,dt,inverseDt,forward,up,...extractMcmOrientationAngles(forward,up)};
}
