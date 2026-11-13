// Original automatic shift helper, 0x4ad720–0x4ad970.
// Speed thresholds are in original feet/second. randomValue is the original
// CRT rand() result for a shift; alternatively drawRandom consumes a shared stream
// only when the original shift branch calls rand().
export function updateMcmGears(input) {
  const {ratios, speedThresholds, thresholdBases, thresholdRanges, gearCount,
    downshiftRpm, shiftDuration, maxRpm, topGearLimitDisabled, speed,
    randomScale} = input;
  let {gear, state, rpmDemand, previousRpmDemand, shiftThreshold, shiftTimer} = input;
  if (shiftTimer !== 0) return {gear, state, rpmDemand, previousRpmDemand, shiftThreshold, shiftTimer, randomUsed: false};
  let direction = 0;
  if (previousRpmDemand <= rpmDemand && rpmDemand > shiftThreshold &&
      speedThresholds[gear] < speed && gear < gearCount - 1) {
    direction = 1;
  } else if (gear > 0 && (previousRpmDemand > rpmDemand || rpmDemand === 0) &&
             downshiftRpm > rpmDemand && speedThresholds[gear - 1] > speed) {
    direction = -1;
  }
  if (direction) {
    const randomValue=input.drawRandom?input.drawRandom():input.randomValue;
    if (!Number.isInteger(randomValue) || randomValue < 0 || randomValue > 32767) throw new RangeError('A shift requires an original CRT random draw');
    const oldGear = gear;
    gear += direction;
    state = Math.min(1, Math.fround((ratios[gear] / ratios[oldGear]) * state));
    rpmDemand = Math.fround(maxRpm * state);
    if (!topGearLimitDisabled && rpmDemand > shiftThreshold && gearCount - gear === 1) rpmDemand = shiftThreshold;
    shiftTimer = shiftDuration;
    shiftThreshold = Math.fround(randomValue * randomScale * thresholdRanges[gear] + thresholdBases[gear]);
  } else shiftTimer = 0;
  previousRpmDemand = rpmDemand;
  return {gear, state, rpmDemand, previousRpmDemand, shiftThreshold, shiftTimer, randomUsed: direction !== 0};
}
