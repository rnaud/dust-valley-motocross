import {floatBits} from './math.js';
import {accumulateMcmContactForce} from './contact-accumulation.js';
import {updateMcmRearTireSubstep} from './rear-tire-substep.js';
const f=Math.fround;

// Original 0x4a8634..0x4a875b. The limiter mutates the selected tire-force
// storage: a temporary for both wheels, or the actual single tire vector.
export function accumulateMcmTireForces(c){
 if(!c.anyContact)return;
 const front=c.frontTire,rear=c.traction.tire;
 if(c.bothContact){
  c.combinedTireForce=rear.force.map((v,i)=>f(v+front.force[i]));
  c.combinedTireMagnitude=f(rear.magnitude+front.magnitude);
 }else c.combinedTireMagnitude=c.frontContact?front.magnitude:rear.magnitude;
 const r=accumulateMcmContactForce({
  first:!!c.frontContact && (floatBits(c.frontMotion.speed)|0)>0x3a83126f,
  second:!!c.rearContact && (floatBits(c.rearMotion.speed)|0)>0x3a83126f,
  mass:c.mass,dt:c.dt,requestedFirst:c.frontMotion.speed,requestedSecond:c.rearMotion.speed,
  armFirst:c.frontLoad.arm,armSecond:c.rearLoad.arm,magnitude:c.combinedTireMagnitude,
  force:c.bothContact?c.combinedTireForce:c.frontContact?front.force:rear.force,
  remaining:c.speedCopy,totalTorque:c.totalTorque,totalForce:c.force});
 if(c.bothContact)c.combinedTireForce=r.force;
 else if(c.frontContact)front.force=r.force;else rear.force=r.force;
 c.speedCopy=r.remaining;c.totalTorque=r.totalTorque;c.force=r.totalForce;
}
export function updateMcmTireAccumulationSubstep(c){
 const result=updateMcmRearTireSubstep(c);accumulateMcmTireForces(c);return result;
}
