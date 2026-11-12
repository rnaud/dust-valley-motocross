import {floatBits} from './math.js';
import {limitMcmContactForce} from './contact-force-limit.js';

// Original 0x4b1570–0x4b1869. Each enabled contact contributes a moment arm;
// with both enabled, the second cross product is added before its float32 store.
export function accumulateMcmContactForce(c) {
  const f=Math.fround;
  let force=[...c.force],remaining=c.remaining,totalForce=[...c.totalForce],totalTorque=[...c.totalTorque];
  if(!c.first && !c.second)return {force,remaining,totalForce,totalTorque};
  const requested=c.first?(c.second?Math.max(c.requestedFirst,c.requestedSecond):c.requestedFirst):c.requestedSecond;
  const change=remaining<requested?remaining:requested;
  if((floatBits(c.magnitude)|0)<=0 || (floatBits(change)&0x7fffffff)===0)return {force,remaining,totalForce,totalTorque};
  ({force,remaining}=limitMcmContactForce({...c,requested:change}));
  totalForce=totalForce.map((v,i)=>f(v+force[i]));
  const cross=a=>[a[1]*force[2]-force[1]*a[2],force[0]*a[2]-force[2]*a[0],force[1]*a[0]-force[0]*a[1]];
  let torque=cross(c.first?c.armFirst:c.armSecond).map(f);
  if(c.first && c.second)torque=cross(c.armSecond).map((v,i)=>f(v+torque[i]));
  totalTorque=totalTorque.map((v,i)=>f(v+torque[i]));
  return {force,remaining,totalForce,totalTorque};
}
