// Original pointer-argument matrix product 0x4b9bb0. Each sum follows x87 order.
export function multiplyMcmMatrixPointers(a,b){
 return [
  Math.fround(((((b[0] * a[0]) + (b[1] * a[4])) + (b[2] * a[8])) + (b[3] * a[12]))),
  Math.fround(((((b[0] * a[1]) + (a[5] * b[1])) + (a[9] * b[2])) + (b[3] * a[13]))),
  Math.fround(((((b[0] * a[2]) + (a[10] * b[2])) + (a[14] * b[3])) + (b[1] * a[6]))),
  Math.fround(((((b[0] * a[3]) + (b[1] * a[7])) + (b[2] * a[11])) + (a[15] * b[3]))),
  Math.fround(((((a[0] * b[4]) + (b[5] * a[4])) + (b[6] * a[8])) + (b[7] * a[12]))),
  Math.fround(((((b[5] * a[5]) + (a[9] * b[6])) + (a[1] * b[4])) + (b[7] * a[13]))),
  Math.fround(((((a[14] * b[7]) + (b[5] * a[6])) + (a[10] * b[6])) + (b[4] * a[2]))),
  Math.fround(((((b[5] * a[7]) + (b[6] * a[11])) + (a[15] * b[7])) + (a[3] * b[4]))),
  Math.fround(((((a[0] * b[8]) + (b[9] * a[4])) + (b[10] * a[8])) + (b[11] * a[12]))),
  Math.fround(((((b[9] * a[5]) + (a[9] * b[10])) + (a[1] * b[8])) + (b[11] * a[13]))),
  Math.fround(((((a[14] * b[11]) + (b[9] * a[6])) + (b[10] * a[10])) + (b[8] * a[2]))),
  Math.fround(((((b[10] * a[11]) + (b[9] * a[7])) + (a[15] * b[11])) + (a[3] * b[8]))),
  Math.fround(((((a[0] * b[12]) + (a[4] * b[13])) + (b[14] * a[8])) + (a[12] * b[15]))),
  Math.fround(((((a[9] * b[14]) + (a[1] * b[12])) + (a[5] * b[13])) + (a[13] * b[15]))),
  Math.fround(((((b[14] * a[10]) + (a[14] * b[15])) + (a[6] * b[13])) + (b[12] * a[2]))),
  Math.fround(((((b[14] * a[11]) + (a[3] * b[12])) + (a[7] * b[13])) + (a[15] * b[15]))),
 ];
}
