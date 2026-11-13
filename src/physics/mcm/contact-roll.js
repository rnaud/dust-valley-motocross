import {floatBits} from './math.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {updateMcmContactForceSubstep} from './contact-forces.js';
const f=Math.fround;
const dot=(a,b)=>(a[1]*b[1]+a[0]*b[0])+a[2]*b[2];
const cross=(a,b)=>[f(a[1]*b[2]-a[2]*b[1]),f(a[2]*b[0]-a[0]*b[2]),f(a[0]*b[1]-a[1]*b[0])];

// Original 0x4a663d..0x4a692a. The cosine is stored before steering blends
// the target angle toward current roll; preserve those distinct values.
export function prepareMcmContactRoll(c){
 if(c.state844||(floatBits(c.speed)|0)>0x42000000){
  const direction=c.contactDirection,rearNormal=c.points[5],projection=f(dot(rearNormal,direction));
  const projected=direction.map(v=>f(v*projection));c.normal=rearNormal.map((v,i)=>f(v-projected[i]));
  if(c.normal.some(v=>v!==0)){
   const [x,y,z]=c.normal,normalInverse=f(mcmInverseSqrt(f((y*y+z*z)+x*x)));
   c.normal=c.normal.map(v=>f(v*normalInverse));
   c.offset=cross(c.points[9],direction);
   const [a,b,d]=c.offset,basisInverse=mcmInverseSqrt(f((a*a+b*b)+d*d));
   const basis=c.offset.map(v=>f(v*basisInverse));c.offset=cross(c.normal,basis);
   const sign=dot(c.offset,direction)<0?1:-1;
   const [u,v,w]=c.offset,squared=(u*u+v*v)+w*w;
   const length=squared===0?0:f(Math.sqrt(f(squared)));
   c.targetRoll=f(Math.asin(sign*Math.min(length,1)));c.targetRollCos=f(Math.cos(c.targetRoll));
   const angle=Math.abs(c.componentAngle),limit=f(.5235987901687622);
   if(angle<limit)c.targetRoll=f(c.targetRoll-(c.targetRoll-c.roll)*((limit-angle)*f(1.909859299659729)));
   return;
  }
 }
 c.targetRollCos=1;c.targetRoll=c.roll;
}

export function updateMcmContactRollSubstep(c){
 const result=updateMcmContactForceSubstep(c);prepareMcmContactRoll(c);return result;
}
