import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {updateMcmSuspensionTravel} from './suspension-travel.js';

// Original 0x4b0db0 through component update 0x49e900. Surface sampling is
// upstream; this computes suspension displacement from supplied contact geometry.
export function updateMcmSuspensionContact(c) {
  const f=Math.fround,n=c.normal,d=c.direction;
  const vertical=f(mul(n[1],d[1]));
  const dot=add(mul(n[2],d[2]),add(mul(n[0],d[0]),vertical));
  const denominator=f(!(dot>=0)?dot:add(mul(-n[2],d[2]),add(mul(-n[0],d[0]),vertical)));
  const distance=floatBits(denominator)>0x80000000?f(div(mul(n[1],c.height),denominator)):f(.002);
  const displacement=d.map(v=>f(mul(distance,v)));
  const componentDisplacement=c.axis.map(v=>f(mul(v,mul(c.scale,distance))));
  const travel=f(mul(-c.scale,distance));
  const result=updateMcmSuspensionTravel({...c,travel,displacement,componentDisplacement});
  const [x,y,z]=result.displacement;
  const compression=result.limited?f(sub(sub(c.height,add(mul(x,0),mul(y,1))),mul(z,0))):0;
  return {...result,compression,contactLimited:result.limited};
}
