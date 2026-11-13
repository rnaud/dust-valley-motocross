import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {floatBits} from './math.js';
import {updateMcmRotatingSuspension} from './rotating-suspension.js';

// Original 0x4b0f60: contact geometry for the component at bike+0x8e8.
export function updateMcmRotatingContact(c) {
  const f=Math.fround,a=c.a,b=c.b,n=c.normal;
  const cross=new Float64Array(3);cross[0]=f(sub(mul(a[1],b[2]),mul(b[1],a[2])));cross[1]=f(sub(mul(b[0],a[2]),mul(b[2],a[0])));cross[2]=f(sub(mul(b[1],a[0]),mul(b[0],a[1])));
  const dot=add(add(mul(n[0],cross[0]),mul(n[1],cross[1])),mul(n[2],cross[2]));
  let denominator=f(dot);
  if(dot>=0) {
    if((floatBits(denominator)&0x7fffffff)===0) {
      const velocityDot=add(add(mul(c.velocity[1],n[1]),mul(c.velocity[0],n[0])),mul(c.velocity[2],n[2]));
      return {displacement:[0,0,0],velocity:[0,0,0],compression:c.height,travel:0,
        matrix:[...c.matrix],previousTravel:0,limited:0,contactLimited:+(velocityDot<-1),cacheValid:c.cacheValid};
    }
    denominator=f(add(add(mul(cross[1],n[1]),mul(cross[0],f(-n[0]))),mul(cross[2],f(-n[2]))));
  }
  const distance=floatBits(denominator)>0x80000000?f(div(mul(c.height,n[1]),denominator)):f(.002);
  const displacement=cross.map(v=>f(mul(distance,v))),travel=f(mul(-c.divisor,distance));
  const result=updateMcmRotatingSuspension({...c,displacement,travel});
  const [x,y,z]=result.displacement;
  const compression=result.limited?f(sub(sub(c.height,add(mul(x,0),mul(y,1))),mul(z,0))):0;
  return {...result,compression,contactLimited:result.limited};
}
