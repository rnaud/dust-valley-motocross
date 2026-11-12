import {updateMcmForceAngular} from './force-angular-step.js';
import {updateMcmForceLinear} from './force-linear-step.js';

// Connected original 0x4aa77d..0x4ab49e for a root transform. Shared fields
// (inertia, contact flags, timestep and scratch vector) have one source of truth.
export function updateMcmForceMotion(c) {
  const angular=updateMcmForceAngular(c);
  const linear=updateMcmForceLinear({...c,totalForce:angular.totalForce,
    velocity:c.linearVelocity,inertiaY:c.inertia[1],scratch540:angular.scratch540});
  return {angular,linear};
}
