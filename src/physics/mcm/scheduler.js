// Static translation of 0x4a54b6–0x4a5552. Not wired into Cannon.
// Explicit float32 memory stores; JS arithmetic is not an x87 emulator.
export const MCM_STEP = Math.fround(0.02);
export const MCM_MAX_ITERATIONS = 10;

export function scheduleMcmFrameState(frameDelta, remainder = 0, nominalStep = MCM_STEP, maxIterations = MCM_MAX_ITERATIONS) {
  const step = Math.fround(nominalStep);
  if (!Number.isFinite(step) || step <= 0 || !Number.isInteger(maxIterations) || maxIterations < 1) throw new RangeError('Expected positive nominal step and iteration cap');
  const delta = Math.fround(frameDelta);
  const carry = Math.fround(remainder);
  if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(carry)) {
    throw new RangeError('Expected nonnegative finite float32 delta and finite remainder');
  }
  // fsts stores the sum but leaves the unrounded x87 value for division.
  const sum = carry + delta;
  const storedSum = Math.fround(sum);
  // The original uses a signed count. Synthetic retained carries can be negative;
  // preserve that entry state even though ordinary real-time frames are positive.
  const wholeSteps = Math.trunc(sum / step); // 0x4be978 truncates toward zero
  if (wholeSteps < -0x80000000 || wholeSteps > 0x7fffffff) throw new RangeError('Step count outside supported signed int32 range');
  if (wholeSteps === 0) {
    // The test is on frameDelta, but the nonzero branch uses carry + delta.
    const dt = delta === 0 ? step : storedSum;
    return {iterations: 1, dt, inverseDt: 1 / dt, remainder: 0, discardedSteps: 0, storedInterval: delta === 0 ? step : storedSum};
  }
  return {
    iterations: Math.min(wholeSteps, maxIterations),
    dt: step,
    inverseDt: 1 / step,
    // Compute using the uncapped count: excess whole steps are discarded.
    remainder: Math.fround(storedSum - wholeSteps * step),
    discardedSteps: Math.max(0, wholeSteps - maxIterations),
    storedInterval: storedSum,
  };
}

// Preserve the original fixed-step public API and its binary64 inverse result.
export function scheduleMcmFrame(frameDelta, remainder = 0) {
  const {storedInterval,...result}=scheduleMcmFrameState(frameDelta,remainder);
  if (result.iterations < 0) throw new RangeError('Step count outside supported nonnegative int32 range');
  return result;
}
