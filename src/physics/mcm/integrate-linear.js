// Original linear integration slice 0x4ab38e–0x4ab49e, x87 CW 0x027f.
// deltaVelocity is already accumulated by upstream forces/contact handling.
// frozen corresponds to bike+0x61c; its broader gameplay meaning is unproven.
export function integrateMcmLinear({position, velocity, deltaVelocity, dt, frozen}) {
  const nextVelocity = velocity.map((v, i) => Math.fround(v + deltaVelocity[i]));
  const [x, y, z] = nextVelocity;
  const squared = Math.fround((z * z + x * x) + y * y);
  const speed = squared === 0 ? 0 : Math.fround(Math.sqrt(squared));
  if (frozen) return {position: [...position], velocity: [0, 0, 0], speed: 0};
  return {position: position.map((v, i) => Math.fround(v + nextVelocity[i] * dt)), velocity: nextVelocity, speed};
}
