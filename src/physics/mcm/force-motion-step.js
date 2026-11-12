import {updateMcmStateOrientation} from './state-orientation.js';
import {updateMcmControllerHandoff} from './controller-handoff.js';
import {updateMcmMotionTransform} from './motion-transform.js';
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

// Extends the same sequence through wheel rotation, translation and body rotation.
export function updateMcmForceMotionTransform(c) {
  const {angular,linear}=updateMcmForceMotion(c);
  const transform=updateMcmMotionTransform({...c,matrix:angular.matrix,
    position:linear.position,angularVelocity:angular.velocity,
    previousPivot:angular.previousPivot,scratch540:linear.scratch540});
  return {angular,linear,transform};
}

// Controller handoff follows body rotation; the zero-state branch is a no-op
// here, and its subsequent orientation handling remains a separate stage.
export function updateMcmMotionController(c){
  const result=updateMcmForceMotionTransform(c);
  const controller=updateMcmControllerHandoff({...c,linearVelocity:result.linear.velocity,
    angularVelocity:result.angular.velocity});
  return {...result,controller};
}

// Adds only the nonzero-state orientation branch. State-zero orientation is
// still excluded, rather than approximated by this branch.
export function updateMcmMotionStateOrientation(c){
  const result=updateMcmMotionController(c);
  const orientation=updateMcmStateOrientation({...c,matrix:result.transform.matrix,
    scratch540:result.transform.axis});
  return {...result,orientation};
}
