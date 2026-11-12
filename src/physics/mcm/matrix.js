// Original 0x40e680, matrix arguments passed by value. Preserve each sum order.
export function multiplyMcmMatrices(a, b) {
  return [
    Math.fround(((((b[1] * a[4]) + (b[3] * a[12])) + (b[2] * a[8])) + (b[0] * a[0]))),
    Math.fround(((((b[1] * a[5]) + (b[3] * a[13])) + (b[2] * a[9])) + (b[0] * a[1]))),
    Math.fround(((((b[2] * a[10]) + (b[3] * a[14])) + (b[1] * a[6])) + (b[0] * a[2]))),
    Math.fround(((((b[1] * a[7]) + (b[3] * a[15])) + (b[2] * a[11])) + (b[0] * a[3]))),
    Math.fround(((((b[5] * a[4]) + (b[6] * a[8])) + (b[7] * a[12])) + (b[4] * a[0]))),
    Math.fround(((((b[5] * a[5]) + (b[6] * a[9])) + (b[7] * a[13])) + (b[4] * a[1]))),
    Math.fround(((((b[6] * a[10]) + (b[7] * a[14])) + (b[4] * a[2])) + (b[5] * a[6]))),
    Math.fround(((((b[5] * a[7]) + (b[4] * a[3])) + (b[6] * a[11])) + (b[7] * a[15]))),
    Math.fround(((((b[9] * a[4]) + (b[10] * a[8])) + (b[11] * a[12])) + (b[8] * a[0]))),
    Math.fround(((((b[9] * a[5]) + (b[10] * a[9])) + (b[8] * a[1])) + (b[11] * a[13]))),
    Math.fround(((((b[10] * a[10]) + (b[11] * a[14])) + (b[8] * a[2])) + (b[9] * a[6]))),
    Math.fround(((((b[9] * a[7]) + (b[10] * a[11])) + (b[11] * a[15])) + (b[8] * a[3]))),
    Math.fround(((((b[14] * a[8]) + (b[15] * a[12])) + (b[13] * a[4])) + (b[12] * a[0]))),
    Math.fround(((((b[14] * a[9]) + (b[12] * a[1])) + (b[13] * a[5])) + (b[15] * a[13]))),
    Math.fround(((((b[15] * a[14]) + (b[14] * a[10])) + (b[12] * a[2])) + (b[13] * a[6]))),
    Math.fround(((b[12] * a[3]) + (((b[14] * a[11]) + (b[13] * a[7])) + (b[15] * a[15])))),
  ];
}
