import {applyMcmCollisionImpulse,rotateMcmWorldVector} from './collision-impulse.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
// Original bike wrapper 0x49d7f0. Audio notification is an optional adapter.
export function applyMcmBikeCollisionImpulse(bike,contact,notify){
 const c={...contact,transform:bike.transform,inverseMass:bike.inverseMass,
  restitution:bike.state844?Math.fround(.1):bike.restitution,
  inverseInertia:bike.state844?bike.alternateInertia:bike.inverseInertia,
  angularVelocity:bike.angularVelocity,velocity:bike.velocity,
  linearScale:bike.state844?0:contact.linearScale};
 applyMcmCollisionImpulse(c);
 bike.angularVelocity=c.angularVelocity;bike.velocity=c.velocity;bike.field654=[...contact.localLever];
 if(contact.type===3)return;
 bike.worldAngularVelocity=rotateMcmWorldVector(resolveMcmWorldMatrix(bike.transform),bike.angularVelocity);
 notify?.(bike,c.impulse,contact.type);
}
