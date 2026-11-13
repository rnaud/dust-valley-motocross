import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
import {limitMcmContactForce} from './contact-force-limit.js';
import {updateMcmTireAccumulationSubstep} from './tire-accumulation-substep.js';
const f=Math.fround,nonzero=v=>(floatBits(v)&0x7fffffff)!==0;

// Original 0x4a875b..0x4a8be0. Brakes consume the same remaining
// velocity-change budget as tire friction, front wheel before rear wheel.
export function applyMcmBrakes(c){
 if(!c.anyContact){
  for(const s of [c.frontSuspension,c.rearSuspension]){
   s.active=0;s.previousTravel=0;s.compression=0;s.contactLimited=+(c.state844===2);
  }
  c.frontSuspension.previousDisplacement=[0,0,0];
  return;
 }
 if(c.state844||!nonzero(c.brakeInput))return;
 const apply=(s,tangent,arm,requested,otherContact,scale)=>{
  const raw=mul(mul(c.brakeCoefficient,c.brakeInput),scale);
  s.magnitude=f(raw);
  s.force=tangent.map((v,i)=>f(-mul(v,i?s.magnitude:raw)));
  if(!c.steeringFlag)s.force=s.force.map(v=>f(-v));
  s.requested=otherContact?f(mul(requested,.5)):requested;
  const limited=limitMcmContactForce({mass:c.mass,dt:c.dt,remaining:c.speedCopy,requested:s.requested,magnitude:s.magnitude,force:s.force});
  s.magnitude=limited.magnitude;s.force=limited.force;c.speedCopy=limited.remaining;
  c.force=c.force.map((v,i)=>f(add(v,s.force[i])));
  const a=arm,b=s.force;
  c.offset=[sub(mul(b[2],a[1]),mul(b[1],a[2])),sub(mul(a[2],b[0]),mul(b[2],a[0])),sub(mul(b[1],a[0]),mul(a[1],b[0]))].map(f);
  c.totalTorque=c.totalTorque.map((v,i)=>f(add(c.offset[i],v)));
 };
 if(c.frontContact&&nonzero(c.frontMotion.forwardMagnitude))apply(c.brakes.front,c.tangent,c.frontLoad.arm,c.frontMotion.forwardMagnitude,c.rearContact,1);
 if(c.rearContact&&nonzero(c.rearMotion.speed))apply(c.brakes.rear,c.rearTangent,c.rearLoad.arm,c.rearMotion.forwardMagnitude,c.frontContact,c.traction.scratch[0]);
}
export function updateMcmBrakingSubstep(c){
 const result=updateMcmTireAccumulationSubstep(c);applyMcmBrakes(c);return result;
}
