import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub,mcmDivide as div} from './x87-arithmetic.js';
import {floatBits} from './math.js';
import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {inverseRotateMcmVector,resolveMcmWorldMatrix} from './world-transform.js';
const f=Math.fround;
// Original 0x4b85c0, including its sum order.
export function rotateMcmWorldVector(m,[x,y,z]){
 return [f(add(add(mul(m[0],x),mul(m[8],z)),mul(m[4],y))),f(add(add(mul(m[5],y),mul(m[1],x)),mul(m[9],z))),f(add(add(mul(m[10],z),mul(m[2],x)),mul(m[6],y)))];
}
// Original 0x45b3c0. Mutates velocity, angular velocity, impulse, and transform cache.
export function applyMcmCollisionImpulse(c){
 const n=c.normal,v=c.contactVelocity,r=c.lever;
 const dot=f(add(add(mul(v[0],n[0]),mul(n[1],v[1])),mul(n[2],v[2])));
 if(c.type===3&&(floatBits(dot)|0)>0)return;
 const cross=[f(sub(mul(n[2],r[1]),mul(n[1],r[2]))),f(sub(mul(r[2],n[0]),mul(n[2],r[0]))),f(sub(mul(n[1],r[0]),mul(r[1],n[0])))];
 const m=resolveMcmWorldMatrix(c.transform),local=inverseRotateMcmVector(m,cross).map((x,i)=>f(mul(x,c.inverseInertia[i]))),world=rotateMcmWorldVector(m,local);
 const torque=[sub(mul(world[1],r[2]),mul(world[2],r[1])),sub(mul(world[2],r[0]),mul(world[0],r[2])),sub(mul(world[0],r[1]),mul(world[1],r[0]))];
 const denominator=add(add(add(mul(torque[0],n[0]),mul(torque[1],n[1])),mul(torque[2],n[2])),c.inverseMass);
 c.impulse=f(div(-mul(add(c.restitution,1),dot),denominator));
 const factor=(floatBits(c.linearScale)&0x7fffffff)!==0?mul(mul(c.impulse,c.linearScale),c.inverseMass):mul(c.impulse,c.inverseMass);
 c.velocity=c.velocity.map((x,i)=>f(add(x,f(mul(n[i],factor)))));
 const angular=local.map(x=>f(mul(c.impulse,x))),rawX=mul(c.angularScale[0],angular[0]);angular[0]=f(rawX);
 if(Math.abs(rawX)>1){
  const rawSpeed=add(add(mul(v[1],v[1]),mul(v[2],v[2])),mul(v[0],v[0])),speed=f(rawSpeed);
  if(rawSpeed===0||Number.isNaN(rawSpeed))return;
  const sign=floatBits(angular[0])>0x80000000?-1:1;
  angular[0]=f(mul(mul(mul(mcmInverseSqrt(speed),Math.abs(dot)),angular[0]),sign));
 }
 angular[1]=f(mul(c.angularScale[1],angular[1]));angular[2]=f(mul(c.angularScale[2],angular[2]));
 c.angularVelocity=c.angularVelocity.map((x,i)=>f(add(x,angular[i])));
}
