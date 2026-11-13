import {floatBits,mcmSqrtLookup as mcmSqrt} from './math.js';
import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {updateMcmRearSuspensionSubstep} from './rear-suspension-substep.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround,dot=(a,b)=>add(add(mul(a[1],b[1]),mul(a[0],b[0])),mul(a[2],b[2]));

// Original 0x4a7c6c..0x4a7f2a, rear contact arm and load split.
export function prepareMcmRearLoad(c){
 if(!c.anyContact || !c.rearContact)return;
 const s=c.rearLoad,n=c.points[5];
 s.arm=c.points[7].map((v,i)=>f(sub(v,c.balanceCenter[i])));
 if(c.frontContact){
  const projection=dot(c.angularVelocity,n);c.offset=n.map(v=>f(mul(v,projection)));
  const a=c.offset,b=s.arm;
  s.angularCross=new Float64Array(3);s.angularCross[0]=f(sub(mul(a[1],b[2]),mul(a[2],b[1])));s.angularCross[1]=f(sub(mul(a[2],b[0]),mul(a[0],b[2])));s.angularCross[2]=f(sub(mul(a[0],b[1]),mul(a[1],b[0])));
  s.force=c.force.map(v=>f(mul(c.frontWeight,v)));
 }else{
  s.angularCross=[0,0,0];s.force=[...c.force];
  c.offset=c.points[7].map((v,i)=>f(sub(v,c.bodyPosition[i])));
  c.frontLoad.localArm=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.offset);
 }
}
// Original 0x4a7f2a..0x4a8216. Rear combined velocity keeps the product
// unrounded until after the angular term is added, unlike the front path.
export function prepareMcmRearVelocity(c){
 if(!c.anyContact || !c.rearContact)return;
 const s=c.rearMotion,n=c.points[5];s.normalLoad=f(Math.abs(dot(n,c.rearLoad.force)));
 if((floatBits(c.speed)|0)>0x3a83126f){
  const projection=dot(n,c.velocity);s.tangent=c.velocity.map((v,i)=>f(sub(v,mul(n[i],projection))));
  if(s.tangent.some(v=>v!==0)){
   const [x,y,z]=s.tangent,inverse=f(mcmInverseSqrt(f((y*y+z*z)+x*x)));
   s.tangent=s.tangent.map(v=>f(mul(v,inverse)));
  }
  const projected=f(dot(c.velocity,s.tangent));c.forwardSpeed=projected;
  const alignment=dot(s.tangent,c.rearTangent);s.alignment=f(alignment);
  s.forwardMagnitude=f(mul(!(alignment>=0)?-s.alignment:s.alignment,projected));c.steeringFlag=+(alignment>=0);
  s.combined=s.tangent.map((v,i)=>f(add(mul(projected,v),c.rearLoad.angularCross[i])));
  const [x,y,z]=s.combined;s.speed=mcmSqrt(f((y*y+z*z)+x*x));
  const inverse=div(1,s.speed);s.direction=s.combined.map(v=>f(mul(v,inverse)));
 }else{
  s.combined=[...c.rearLoad.angularCross];const [x,y,z]=s.combined;s.speed=mcmSqrt(f((y*y+z*z)+x*x));
  c.forwardSpeed=0;s.forwardMagnitude=0;s.direction=[0,0,0];
 }
}
export function updateMcmRearMotionSubstep(c){
 const result=updateMcmRearSuspensionSubstep(c);prepareMcmRearLoad(c);prepareMcmRearVelocity(c);return result;
}
