import {floatBits} from './math.js';

// Original 0x4ad980–0x4adb0a, under the game's 0x027f x87 control word.
// The caller supplies bike+0x564 as speed and bike+0x584 as direction.
export function calculateMcmDriveForce({released, speed, direction, rpmDemand,
  gearRatio, knotCount, knots, samples, slopes, forceScale, ai = false, aiScale = 1}) {
  if (released) return {scalar: 0, vector: [0, 0, 0]};
  let i = 0;
  while (i < knotCount && knots[i] < rpmDemand) i++;
  let force = ((rpmDemand - knots[i]) * slopes[i] + samples[i]) * gearRatio;
  // The executable compares signed float bits here, not absolute speed.
  if ((floatBits(speed) | 0) >= 0x3f8147ae) force /= speed;
  const scalar = Math.fround(force * forceScale);
  const magnitude = ai ? aiScale * scalar : scalar;
  return {scalar, vector: direction.map(component => Math.fround(component * magnitude))};
}
