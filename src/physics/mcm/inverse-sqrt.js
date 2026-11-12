import {floatBits, bitsFloat} from './math.js';

// Original table initialization 0x401720 and two-refinement lookup 0x401770.
// Return the binary64 intermediate, as the original x87 CW 0x027f path does;
// callers decide where float32 stores occur.
const seeds = new Uint8Array(128);
for (let i = 0; i < seeds.length; i++) {
  const input = bitsFloat((0x1f80 | i) << 17);
  seeds[i] = ((floatBits(1 / Math.sqrt(input)) + 0x2000) >>> 15) & 255;
}
seeds[64] = 255;
export function mcmInverseSqrt(value) {
  const bits = floatBits(value);
  if (bits < 0x00800000 || bits >= 0x7f800000) throw new RangeError('mcmInverseSqrt requires a positive normal float32');
  const index = (bits & 0xfe0000) >>> 17;
  const exponent = ((0x5f000000 - ((bits & 0x7f800000) >>> 1)) & 0xff800000) >>> 0;
  let estimate = bitsFloat(exponent | (seeds[index] << 15));
  estimate = ((3 - (estimate * estimate) * value) * estimate) * .5;
  return ((3 - (estimate * estimate) * value) * estimate) * .5;
}
