import {floatBits} from './math.js';
import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {updateMcmContactForceSubstep} from './contact-forces.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;
const dot=(a,b)=>add(add(mul(a[1],b[1]),mul(a[0],b[0])),mul(a[2],b[2]));
const cross=(a,b)=>new Float64Array([f(sub(mul(a[1],b[2]),mul(a[2],b[1]))),f(sub(mul(a[2],b[0]),mul(a[0],b[2]))),f(sub(mul(a[0],b[1]),mul(a[1],b[0])))]);

// Original 0x4a663d..0x4a692a. The cosine is stored before steering blends
// the target angle toward current roll; preserve those distinct values.
export function prepareMcmContactRoll(c){
 if(c.state844||(floatBits(c.speed)|0)>0x42000000){
  const direction=c.contactDirection,rearNormal=c.points[5],projection=f(dot(rearNormal,direction));
  const projected=direction.map(v=>f(mul(v,projection)));c.normal=rearNormal.map((v,i)=>f(sub(v,projected[i])));
  if(c.normal.some(v=>v!==0)){
   const [x,y,z]=c.normal,normalInverse=f(mcmInverseSqrt(f((y*y+z*z)+x*x)));
   c.normal=c.normal.map(v=>f(mul(v,normalInverse)));
   c.offset=cross(c.points[9],direction);
   const [a,b,d]=c.offset,basisInverse=mcmInverseSqrt(f((a*a+b*b)+d*d));
   const basis=c.offset.map(v=>f(mul(v,basisInverse)));c.offset=cross(c.normal,basis);
   const sign=!(dot(c.offset,direction)>=0)?1:-1;
   const [u,v,w]=c.offset,squared=(u*u+v*v)+w*w;
   const length=squared===0||Number.isNaN(squared)?0:f(Math.sqrt(f(squared)));
   c.targetRoll=f(Math.asin(sign*Math.min(length,1)));c.targetRollCos=f(Math.cos(c.targetRoll));
   const angle=Math.abs(c.componentAngle),limit=f(.5235987901687622);
   if(!(angle>=limit))c.targetRoll=f(sub(c.targetRoll,mul(sub(c.targetRoll,c.roll),mul(sub(limit,angle),f(1.909859299659729)))));
   return;
  }
 }
 c.targetRollCos=1;c.targetRoll=c.roll;
}

export function updateMcmContactRollSubstep(c){
 const result=updateMcmContactForceSubstep(c);prepareMcmContactRoll(c);return result;
}
