import {updateMcmAngularIntegrationSubstep} from './angular-integration-substep.js';
import {updateMcmForceLinear} from './force-linear-step.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x4aaf02..0x4ab49e. Crashed chassis contact joins at 0x4ab426.
export function integrateMcmSubstepLinearVelocity(c){
 const s=c.linearIntegration;
 if(c.state844&&c.chassisContact.enabled){
  if(s.frozen){c.velocity=[0,0,0];c.chassisImpulse.speed=0;}
  else c.bodyPosition=c.bodyPosition.map((v,i)=>f(add(mul(c.velocity[i],c.dt),v)));
  return;
 }
 const r=updateMcmForceLinear({
  totalForce:c.force,inverseMass:c.traction.inverseMass,dt:c.dt,position:c.bodyPosition,velocity:c.velocity,frozen:s.frozen,
  both:c.bothContact,contact:c.anyContact,field738:c.rearMotion.forwardMagnitude,
  fieldcc:c.traction.tire.perpendicular,fieldc8:c.frontTire.perpendicular,
  axis584:c.rearTangent,direction4ec:c.rearMotion.direction,scratch540:c.offset,
  field90:c.chassisContact.absTurn,field44:c.traction.scratch[0],field54:c.driveScalar,
  field5dc:s.field5dc,field68:c.traction.scratch[1],inertiaY:c.chassisImpulse.normalY,
  field4f0:c.targetRoll,field8cc:s.field8cc,field6d8:s.angle,field6dc:s.decay,field6e0:s.counter,
 });
 c.bodyPosition=r.position;c.velocity=r.velocity;c.chassisImpulse.speed=r.speed;
 c.traction.acceleration=r.acceleration;s.deltaVelocity=r.deltaVelocity;c.offset=r.scratch540;
 s.angle=r.field6d8;s.decay=r.field6dc;s.counter=r.field6e0;s.rotation=r.rotation;
}
export function updateMcmLinearIntegrationSubstep(c){
 const r=updateMcmAngularIntegrationSubstep(c);integrateMcmSubstepLinearVelocity(c);return r;
}
