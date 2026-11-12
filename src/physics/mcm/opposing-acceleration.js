// Original 0x4b0a70–0x4b0daf. Used before the angular velocity update.
// Opposing acceleration is combined without allowing it to reverse motion.
// Each axis's mask bit bypasses the special stationary branch.
export function applyMcmOpposingAcceleration({velocity, acceleration, opposing, dt, mask = 0}) {
  const v = [...velocity], a = [...acceleration];
  for (let i = 0; i < 3; i++) {
    const d = opposing[i];
    if (d === 0) continue;
    if (!(mask & (1 << i)) && v[i] === 0) {
      if (a[i] !== 0 && (d < 0) !== (a[i] < 0)) {
        a[i] = Math.abs(a[i]) > Math.abs(d) ? Math.fround(a[i] + d) : 0;
      }
    } else {
      const predicted = Math.fround(a[i] * dt + v[i]);
      const unroundedStep = d * dt, step = Math.fround(unroundedStep);
      if ((unroundedStep < 0) !== (predicted < 0) && Math.abs(step) >= Math.abs(predicted) && predicted !== 0) {
        v[i] = 0; a[i] = 0;
      } else a[i] = Math.fround(a[i] + d);
    }
  }
  return {velocity: v, acceleration: a};
}
