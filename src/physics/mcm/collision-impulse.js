import {mcmAdd as add,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {floatBits} from './math.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {inverseRotateMcmVector,resolveMcmWorldMatrix} from './world-transform.js';
const f=Math.fround;
// Original 0x4b85c0, including its sum order.
export function rotateMcmWorldVector(m,[x,y,z]){
 return [f((m[0]*x+m[8]*z)+m[4]*y),f((m[5]*y+m[1]*x)+m[9]*z),f((m[10]*z+m[2]*x)+m[6]*y)];
}
// Original 0x45b3c0. Mutates velocity, angular velocity, impulse, and transform cache.
export function applyMcmCollisionImpulse(c){
 const n=c.normal,v=c.contactVelocity,r=c.lever;
 const dot=f((v[0]*n[0]+n[1]*v[1])+n[2]*v[2]);
 if(c.type===3&&(floatBits(dot)|0)>0)return;
 const cross=[f(n[2]*r[1]-n[1]*r[2]),f(r[2]*n[0]-n[2]*r[0]),f(n[1]*r[0]-r[1]*n[0])];
 const m=resolveMcmWorldMatrix(c.transform),local=inverseRotateMcmVector(m,cross).map((x,i)=>f(x*c.inverseInertia[i])),world=rotateMcmWorldVector(m,local);
 const torque=[world[1]*r[2]-world[2]*r[1],world[2]*r[0]-world[0]*r[2],world[0]*r[1]-world[1]*r[0]];
 const denominator=((torque[0]*n[0]+torque[1]*n[1])+torque[2]*n[2])+c.inverseMass;
 c.impulse=f(div(-mul(add(c.restitution,1),dot),denominator));
 const factor=(floatBits(c.linearScale)&0x7fffffff)!==0?mul(mul(c.impulse,c.linearScale),c.inverseMass):mul(c.impulse,c.inverseMass);
 c.velocity=c.velocity.map((x,i)=>f(add(x,f(mul(n[i],factor)))));
 const angular=local.map(x=>f(mul(c.impulse,x))),rawX=mul(c.angularScale[0],angular[0]);angular[0]=f(rawX);
 if(Math.abs(rawX)>1){
  const rawSpeed=(v[1]*v[1]+v[2]*v[2])+v[0]*v[0],speed=f(rawSpeed);
  if(rawSpeed===0)return;
  const sign=floatBits(angular[0])>0x80000000?-1:1;
  angular[0]=f(((mcmInverseSqrt(speed)*Math.abs(dot))*angular[0])*sign);
 }
 angular[1]=f(mul(c.angularScale[1],angular[1]));angular[2]=f(mul(c.angularScale[2],angular[2]));
 c.angularVelocity=c.angularVelocity.map((x,i)=>f(add(x,angular[i])));
}
