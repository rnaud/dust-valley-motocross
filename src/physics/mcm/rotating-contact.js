import {floatBits} from './math.js';
import {updateMcmRotatingSuspension} from './rotating-suspension.js';

// Original 0x4b0f60: contact geometry for the component at bike+0x8e8.
export function updateMcmRotatingContact(c) {
  const f=Math.fround,a=c.a,b=c.b,n=c.normal;
  const cross=[f(a[1]*b[2]-b[1]*a[2]),f(b[0]*a[2]-b[2]*a[0]),f(b[1]*a[0]-b[0]*a[1])];
  const dot=(n[0]*cross[0]+n[1]*cross[1])+n[2]*cross[2];
  let denominator=f(dot);
  if(dot>=0) {
    if((floatBits(denominator)&0x7fffffff)===0) {
      const velocityDot=(c.velocity[1]*n[1]+c.velocity[0]*n[0])+c.velocity[2]*n[2];
      return {displacement:[0,0,0],velocity:[0,0,0],compression:c.height,travel:0,
        matrix:[...c.matrix],previousTravel:0,limited:0,contactLimited:+(velocityDot<-1),cacheValid:c.cacheValid};
    }
    denominator=f((cross[1]*n[1]+cross[0]*f(-n[0]))+cross[2]*f(-n[2]));
  }
  const distance=floatBits(denominator)>0x80000000?f((c.height*n[1])/denominator):f(.002);
  const displacement=cross.map(v=>f(distance*v)),travel=f(-c.divisor*distance);
  const result=updateMcmRotatingSuspension({...c,displacement,travel});
  const [x,y,z]=result.displacement;
  const compression=result.limited?f((c.height-(x*0+y*1))-z*0):0;
  return {...result,compression,contactLimited:result.limited};
}
