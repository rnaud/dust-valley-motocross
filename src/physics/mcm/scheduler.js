// Static translation of 0x4a54b6–0x4a5552. Not wired into Cannon.
// Explicit float32 memory stores; JS arithmetic is not an x87 emulator.
export const MCM_STEP = Math.fround(0.02);
export const MCM_MAX_ITERATIONS = 10;

export function scheduleMcmFrame(frameDelta, remainder = 0) {
  const delta = Math.fround(frameDelta);
  const carry = Math.fround(remainder);
  if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(carry)) {
    throw new RangeError('Expected nonnegative finite float32 delta and finite remainder');
  }
  // fsts stores the sum but leaves the unrounded x87 value for division.
  const sum = carry + delta;
  const storedSum = Math.fround(sum);
  const wholeSteps = Math.trunc(sum / MCM_STEP); // 0x4be978 truncates toward zero
  if (wholeSteps < 0 || wholeSteps > 0x7fffffff) throw new RangeError('Step count outside supported nonnegative int32 range');
  if (wholeSteps === 0) {
    // The test is on frameDelta, but the nonzero branch uses carry + delta.
    const dt = delta === 0 ? MCM_STEP : storedSum;
    return {iterations: 1, dt, inverseDt: 1 / dt, remainder: 0, discardedSteps: 0};
  }
  return {
    iterations: Math.min(wholeSteps, MCM_MAX_ITERATIONS),
    dt: MCM_STEP,
    inverseDt: 1 / MCM_STEP,
    // Compute using the uncapped count: excess whole steps are discarded.
    remainder: Math.fround(storedSum - wholeSteps * MCM_STEP),
    discardedSteps: Math.max(0, wholeSteps - MCM_MAX_ITERATIONS),
  };
}
