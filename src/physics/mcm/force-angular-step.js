import {accumulateMcmPairedForceTorque} from './paired-force-torque.js';
import {calculateMcmContactTorque} from './contact-torque.js';
import {inverseRotateMcmVector} from './world-transform.js';
import {updateMcmAngularWithContact} from './angular-step.js';

// Original 0x4aa77d..0x4aaf02 for a root transform. The third
// contribution may reset angular velocity X before opposing acceleration runs.
export function updateMcmForceAngular(c) {
  const f=Math.fround, paired=accumulateMcmPairedForceTorque(c);
  const third=calculateMcmContactTorque({a:c.arm3c0,b:c.force354,
    field4dc:c.field4dc,angularVelocityX:c.velocity[0],ai:c.ai,flag:c.front,
    field6ec:c.control,component44:c.component44});
  const local=inverseRotateMcmVector(c.matrix,third.torque);
  const totalTorque=paired.totalTorque.map((v,i)=>f(v+local[i]));
  const totalForce=paired.totalForce.map((v,i)=>f(v+c.force354[i]));
  const angular=updateMcmAngularWithContact({...c,state:c.state844,inertia:[...c.inertia,...c.inertiaAlternate],torque:totalTorque,
    velocity:[third.angularVelocityX,...c.velocity.slice(1)]});
  return {totalForce,totalTorque,...angular,counter:paired.counter,previousPivot:[...c.pivot]};
}
