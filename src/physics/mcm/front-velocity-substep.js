import {calculateMcmTireForce} from './tire-force.js';
import {floatBits,mcmSqrtLookup as mcmSqrt} from './math.js';
import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {updateMcmFrontLoadSubstep} from './front-load-substep.js';
const f=Math.fround,dot=(a,b)=>(a[1]*b[1]+a[0]*b[0])+a[2]*b[2];

// Original 0x4a7717..0x4a7a20. The speed gate compares signed float bits.
export function prepareMcmFrontVelocity(c){
 if(!c.anyContact || !c.frontContact)return;
 const s=c.frontMotion,n=c.points[4];
 s.normalLoad=f(Math.abs(dot(c.frontLoad.force,n)));
 if((floatBits(c.speed)|0)>0x3a83126f){
  const projection=dot(n,c.velocity);
  s.tangent=c.velocity.map((v,i)=>f(v-n[i]*projection));
  if(s.tangent.some(v=>v!==0)){
   const [x,y,z]=s.tangent,inverse=f(mcmInverseSqrt(f((y*y+z*z)+x*x)));
   s.tangent=s.tangent.map(v=>f(v*inverse));
  }
  const projectedSpeed=f(dot(c.velocity,s.tangent));
  if(!c.rearContact)c.forwardSpeed=projectedSpeed;
  const alignment=dot(s.tangent,c.tangent);s.alignment=f(alignment);
  s.forwardMagnitude=f((alignment<0?-s.alignment:s.alignment)*projectedSpeed);
  if(!c.rearContact)c.steeringFlag=+(alignment>=0);
  s.linear=s.tangent.map(v=>f(v*projectedSpeed));
  s.combined=s.linear.map((v,i)=>f(v+c.frontLoad.angularCross[i]));
 }else{
  s.combined=[...c.frontLoad.angularCross];
  if(!c.rearContact)c.forwardSpeed=0;
  s.linear=[0,0,0];s.forwardMagnitude=0;
 }
 const [x,y,z]=s.combined;s.speed=mcmSqrt(f((y*y+z*z)+x*x));
}
// Original 0x4a7a20..0x4a7b27, excluding the rear-only entry at 0x4a7ad6.
export function prepareMcmFrontTireForce(c){
 if(!c.anyContact || !c.frontContact)return;
 const s=c.frontMotion,t=c.frontTire;
 if((floatBits(s.speed)|0)>0x3a83126f){
  const inverse=1/s.speed;t.direction=s.combined.map(v=>f(v*inverse));
  Object.assign(t,calculateMcmTireForce({axis:c.tangent,direction:t.direction,
   load:s.normalLoad,coefficient5b0:t.coefficient5b0,coefficient5b4:t.coefficient5b4}));
 }else{t.force=[0,0,0];t.magnitude=0;}
}
export function updateMcmFrontVelocitySubstep(c){
 const result=updateMcmFrontLoadSubstep(c);prepareMcmFrontVelocity(c);prepareMcmFrontTireForce(c);return result;
}
