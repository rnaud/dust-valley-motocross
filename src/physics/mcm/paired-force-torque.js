import {floatBits} from './math.js';
import {inverseRotateMcmVector} from './world-transform.js';

// Original 0x4aa77d..0x4aa959. Inputs are the already assembled forces.
// The two pitch clips update the same counter in sequence, including resets.
export function accumulateMcmPairedForceTorque(c) {
  const f=Math.fround;
  const cross=(a,b)=>[f(a[1]*b[2]-b[1]*a[2]),f(b[0]*a[2]-b[2]*a[0]),f(b[1]*a[0]-b[0]*a[1])];
  const totalForce=c.totalForce.map((v,i)=>f(f(v+c.force2ac[i])+c.force2b8[i]));
  const first=inverseRotateMcmVector(c.matrix,cross(c.arm3c0,c.force2b8));
  let counter=c.counter>>>0;
  if(floatBits(first[0])>0x80000000){
    first[0]=0;
    if((floatBits(c.control)|0)>0x3f666666)counter=(counter+1)>>>0;
  }else counter=0;
  const scratch540=cross(c.arm3fc,c.force2ac);
  const scratch54c=inverseRotateMcmVector(c.matrix,scratch540);
  if((floatBits(scratch54c[0])|0)>0){
    scratch54c[0]=0;
    if(floatBits(c.control)<0xbf666666)counter=(counter+1)>>>0;
  }else counter=0;
  return {totalForce,totalTorque:first.map((v,i)=>f(v+scratch54c[i])),scratch540,scratch54c,counter};
}
