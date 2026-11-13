import {inverseRotateMcmVector,resolveMcmWorldMatrix} from './world-transform.js';
import {rotateMcmWorldVector} from './collision-impulse.js';
const f=Math.fround;
const cross=(a,b)=>[f(a[1]*b[2]-b[1]*a[2]),f(a[2]*b[0]-b[2]*a[0]),f(b[1]*a[0]-a[1]*b[0])];
// Original 0x45b6b0. A null second velocity destination suppresses both B updates,
// but its transform/inertia still contribute to the impulse denominator.
export function applyMcmPairedCollisionImpulse(c){
 const {a,b,normal:n}=c,delta=a.contactVelocity.map((x,i)=>f(x-b.contactVelocity[i]));
 const numerator=f(-(((n[1]*delta[1]+n[0]*delta[0])+n[2]*delta[2])*(c.restitution+1)));
 const contribution=body=>{
  const m=resolveMcmWorldMatrix(body.transform),local=inverseRotateMcmVector(m,cross(body.lever,n)).map((x,i)=>f(x*body.inverseInertia[i]));
  return {local,torque:cross(rotateMcmWorldVector(m,local),body.lever)};
 };
 const ca=contribution(a),cb=contribution(b),torque=ca.torque.map((x,i)=>f(x+cb.torque[i]));
 const denominator=(((n[1]*torque[1]+n[0]*torque[0])+n[2]*torque[2])+b.inverseMass)+a.inverseMass;
 const rawImpulse=numerator/denominator;c.impulse=f(rawImpulse);
 const linearA=rawImpulse*a.inverseMass;
 a.velocity=a.velocity.map((x,i)=>f(x+f(n[i]*linearA)));
 a.angularVelocity=a.angularVelocity.map((x,i)=>f(x+f(c.impulse*ca.local[i])));
 if(c.updateB){
  const linearB=-(c.impulse*b.inverseMass);
  b.velocity=b.velocity.map((x,i)=>f(x+f(n[i]*linearB)));
  b.angularVelocity=b.angularVelocity.map((x,i)=>f(x+f(-c.impulse*cb.local[i])));
 }
}
