import {mcmSqrt} from './math.js';

// Original 0x4b11e0–0x4b1315. Inputs retain original feet/lbf/slug units.
// The caller supplies the signs and magnitudes of both vectors.
export function calculateMcmSuspension({displacement, velocity, compression,
  linearStiffness, cubicStiffness, dampingMultiplier, velocityLimit,
  massShare, extraStiffness, mass}) {
  const [x,y,z] = velocity;
  const speed = mcmSqrt(Math.fround((x*x + y*y) + z*z));
  const stiffness = Math.fround((cubicStiffness * compression) * compression + linearStiffness);
  let damping = (Math.sqrt((mass * stiffness) * massShare) * dampingMultiplier) * -2;
  if (velocityLimit < speed) damping *= ((speed - velocityLimit) * .5 + velocityLimit) / speed;
  const dampingForce = velocity.map(v=>Math.fround(v*damping));
  const force = displacement.map((v,i)=>Math.fround(Math.fround(v*(stiffness+extraStiffness))+dampingForce[i]));
  return {force,dampingForce};
}
