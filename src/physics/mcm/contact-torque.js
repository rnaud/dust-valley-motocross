import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';

// Original 0x4b1ad0. Offset names intentionally retain unresolved field meanings.
// Finite float32 inputs; this helper can also change bike angular velocity X.
export function calculateMcmContactTorque({a,b,field4dc,angularVelocityX,ai,flag,field6ec,component44}) {
  const f=Math.fround;
  const cross=new Float64Array(3);cross[0]=f(sub(mul(a[1],b[2]),mul(b[1],a[2])));cross[1]=f(sub(mul(b[0],a[2]),mul(a[0],b[2])));cross[2]=f(sub(mul(a[0],b[1]),mul(b[0],a[1])));
  const angularBits=floatBits(angularVelocityX);
  if ((floatBits(field4dc)|0)>0x3f5f6944 && flag) {
    return {torque:[0,0,0],angularVelocityX:angularBits>0x80000000?0:angularVelocityX};
  }
  if (ai) return {torque:[0,0,0],angularVelocityX};
  const alignment=Math.min(Math.abs(field4dc),1);
  const rawControl=-add(field6ec,.125),control=!(rawControl>=0)?0:f(rawControl);
  let scale;
  if (flag && angularBits<0xbe99999a) {
    scale=mul(mul(mul(sub(f(.9),Math.abs(component44)),sub(1,alignment)),control),f(.571));
  } else if (angularBits>0xbf000000) scale=f(.1);
  else scale=mul(mul(sub(1,alignment),control),f(.8));
  return {torque:cross.map(v=>f(mul(v,scale))),angularVelocityX};
}
