// Original digital-input branch, 0x4ad5ad–0x4ad712.
// This models the engine's normalized RPM-demand state, not wheel torque.
export function updateMcmDigitalThrottle({state, released, shiftTimer, pressed, aiDemand = 0, dt, maxRpm}) {
  let level = Math.fround(state);
  const timer = Math.fround(shiftTimer), step = Math.fround(dt);
  if (![level, timer, step].every(Number.isFinite) || level < 0 || level > 1 || timer < 0 || step < 0 || !Number.isInteger(maxRpm) || maxRpm < 0 || maxRpm > 0x7fffffff) {
    throw new RangeError('Unsupported original throttle state');
  }
  let releaseFlag = released;
  if ((pressed || aiDemand > 0) && timer === 0) {
    releaseFlag = 0;
    if (level < 1) level = Math.min(1, Math.fround(level + step));
  } else if (level > 0) {
    releaseFlag = 1;
    const decrement = Math.fround(step * (timer !== 0 ? Math.fround(0.6) : 2));
    level = Math.max(0, Math.fround(level - decrement));
  }
  return {state: level, released: releaseFlag, rpmDemand: Math.fround(maxRpm * level)};
}
