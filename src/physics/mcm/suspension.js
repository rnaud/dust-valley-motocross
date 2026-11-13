import {mcmSqrtLookup,bitsFloat} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';

// Original 0x4b11e0–0x4b1315. Inputs retain original feet/lbf/slug units.
// The caller supplies the signs and magnitudes of both vectors.
export function calculateMcmSuspension({displacement, velocity, compression,
  linearStiffness, cubicStiffness, dampingMultiplier, velocityLimit,
  massShare, extraStiffness, mass}) {
  const [x,y,z] = velocity;
  const speed=mcmSqrtLookup(Math.fround(add(add(mul(x,x),mul(y,y)),mul(z,z))));
  const stiffness=Math.fround(add(mul(mul(cubicStiffness,compression),compression),linearStiffness));
  const squared=mul(mul(mass,stiffness),massShare);
  const root=Number.isNaN(squared)?squared:squared<0?bitsFloat(0xffc00000):Math.sqrt(squared);
  let damping=mul(mul(root,dampingMultiplier),-2);
  if(!(velocityLimit>=speed))damping=mul(damping,div(add(mul(sub(speed,velocityLimit),.5),velocityLimit),speed));
  const dampingForce=velocity.map(v=>Math.fround(mul(v,damping)));
  const force=displacement.map((v,i)=>Math.fround(add(dampingForce[i],Math.fround(mul(v,add(stiffness,extraStiffness))))));
  return {force,dampingForce};
}
