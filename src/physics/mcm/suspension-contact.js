import {floatBits} from './math.js';
import {updateMcmSuspensionTravel} from './suspension-travel.js';

// Original 0x4b0db0 through component update 0x49e900. Surface sampling is
// upstream; this computes suspension displacement from supplied contact geometry.
export function updateMcmSuspensionContact(c) {
  const f=Math.fround,n=c.normal,d=c.direction;
  const vertical=f(n[1]*d[1]);
  const dot=n[2]*d[2]+(n[0]*d[0]+vertical);
  const denominator=f(dot<0?dot:(-n[2]*d[2])+(-n[0]*d[0]+vertical));
  const distance=floatBits(denominator)>0x80000000?f((n[1]*c.height)/denominator):f(.002);
  const displacement=d.map(v=>f(distance*v));
  const componentDisplacement=c.axis.map(v=>f(v*(c.scale*distance)));
  const travel=f(-c.scale*distance);
  const result=updateMcmSuspensionTravel({...c,travel,displacement,componentDisplacement});
  const [x,y,z]=result.displacement;
  const compression=result.limited?f((c.height-(x*0+y*1))-z*0):0;
  return {...result,compression,contactLimited:result.limited};
}
