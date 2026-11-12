import {applyMcmContactCorrection} from './contact-correction.js';
import {inverseRotateMcmVector} from './world-transform.js';
import {applyMcmOpposingAcceleration} from './opposing-acceleration.js';

// 0x4aaa55–0x4aaf02, with contact correction flag (stack+0x24) clear.
// Torque is already local. The opposing torque is still in world coordinates.
export function integrateMcmAngular({matrix,velocity,torque,opposingWorld,inertia,inertiaAlternate,dt,state844}) {
  const f=Math.fround, inv=state844?inertiaAlternate:inertia;
  const acceleration=state844?torque.map((v,i)=>f(inv[i]*v)):[f(inv[0]*torque[0]),0,0];
  const opposingLocal=inverseRotateMcmVector(matrix,opposingWorld);
  const opposing=opposingLocal.map((v,i)=>f((inv[i]*v)*(state844?1:[f(.1),1,.5][i])));
  const damped=applyMcmOpposingAcceleration({velocity,acceleration,opposing,dt});
  return {velocity:damped.velocity.map((v,i)=>f(damped.acceleration[i]*dt+v)),acceleration:damped.acceleration,opposing,opposingLocal};
}

// Complete 0x4aaa55–0x4aaf02 block for a root transform. Contact correction
// must precede the opposing-torque conversion, which reads the updated matrix.
export function updateMcmAngularWithContact(c) {
  const correction=applyMcmContactCorrection(c);
  const integrated=integrateMcmAngular({matrix:correction.matrix,velocity:c.velocity,
    torque:c.torque,opposingWorld:c.opposingWorld,inertia:c.inertia.slice(0,3),
    inertiaAlternate:c.inertia.slice(3),dt:c.dt,state844:c.state});
  return {...correction,...integrated};
}
