import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
// Original linear integration slice 0x4ab38e–0x4ab49e, x87 CW 0x027f.
// deltaVelocity is already accumulated by upstream forces/contact handling.
// frozen corresponds to bike+0x61c; its broader gameplay meaning is unproven.
export function integrateMcmLinear({position, velocity, deltaVelocity, dt, frozen}) {
  const nextVelocity = velocity.map((v, i) => Math.fround(add(v,deltaVelocity[i])));
  const [x, y, z] = nextVelocity;
  const rawSquared = add(add(mul(z,z),mul(x,x)),mul(y,y));
  const squared = Math.fround(rawSquared);
  // The original tests x87 C3 before sqrt: zero and unordered both clear speed.
  const speed = rawSquared === 0 || Number.isNaN(rawSquared) ? 0 : Math.fround(Math.sqrt(squared));
  if (frozen) return {position: [...position], velocity: [0, 0, 0], speed: 0};
  return {position: position.map((v, i) => Math.fround(add(mul(nextVelocity[i],dt),v))), velocity: nextVelocity, speed};
}
