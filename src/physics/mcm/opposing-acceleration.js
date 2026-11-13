import {floatBits} from './math.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
// Original unsigned bit comparisons include negative NaNs but exclude -0.
const negative=x=>floatBits(x)>0x80000000;

// Original 0x4b0a70–0x4b0daf. Used before the angular velocity update.
// Opposing acceleration is combined without allowing it to reverse motion.
// Each axis's mask bit bypasses the special stationary branch.
export function applyMcmOpposingAcceleration({velocity, acceleration, opposing, dt, mask = 0}) {
  const v = [...velocity], a = [...acceleration];
  for (let i = 0; i < 3; i++) {
    const d = opposing[i];
    if (d === 0) continue;
    if (!(mask & (1 << i)) && v[i] === 0) {
      if (a[i] !== 0 && negative(d) !== negative(a[i])) {
        a[i] = Math.abs(a[i]) > Math.abs(d) ? Math.fround(add(d,a[i])) : 0;
      }
    } else {
      const predicted = Math.fround(add(mul(a[i],dt),v[i]));
      const unroundedStep = mul(d,dt), step = Math.fround(unroundedStep);
      if (!(unroundedStep >= 0) !== negative(predicted) && Math.abs(step) >= Math.abs(predicted) && predicted !== 0) {
        v[i] = 0; a[i] = 0;
      } else a[i] = Math.fround(add(d,a[i]));
    }
  }
  return {velocity: v, acceleration: a};
}
