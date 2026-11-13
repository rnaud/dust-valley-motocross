import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
const storeMatrixFloat=Math.fround;

// Original 0x40e680, matrix arguments passed by value. Preserve each sum order.
export function multiplyMcmMatrices(a, b) {
  return [
    storeMatrixFloat(add(add(add(mul(b[1],a[4]),mul(b[3],a[12])),mul(b[2],a[8])),mul(b[0],a[0]))),
    storeMatrixFloat(add(add(add(mul(b[1],a[5]),mul(b[3],a[13])),mul(b[2],a[9])),mul(b[0],a[1]))),
    storeMatrixFloat(add(add(add(mul(b[2],a[10]),mul(b[3],a[14])),mul(b[1],a[6])),mul(b[0],a[2]))),
    storeMatrixFloat(add(add(add(mul(b[1],a[7]),mul(b[3],a[15])),mul(b[2],a[11])),mul(b[0],a[3]))),
    storeMatrixFloat(add(add(add(mul(b[5],a[4]),mul(b[6],a[8])),mul(b[7],a[12])),mul(b[4],a[0]))),
    storeMatrixFloat(add(add(add(mul(b[5],a[5]),mul(b[6],a[9])),mul(b[7],a[13])),mul(b[4],a[1]))),
    storeMatrixFloat(add(add(add(mul(b[6],a[10]),mul(b[7],a[14])),mul(b[4],a[2])),mul(b[5],a[6]))),
    storeMatrixFloat(add(add(add(mul(b[5],a[7]),mul(b[4],a[3])),mul(b[6],a[11])),mul(b[7],a[15]))),
    storeMatrixFloat(add(add(add(mul(b[9],a[4]),mul(b[10],a[8])),mul(b[11],a[12])),mul(b[8],a[0]))),
    storeMatrixFloat(add(add(add(mul(b[9],a[5]),mul(b[10],a[9])),mul(b[8],a[1])),mul(b[11],a[13]))),
    storeMatrixFloat(add(add(add(mul(b[10],a[10]),mul(b[11],a[14])),mul(b[8],a[2])),mul(b[9],a[6]))),
    storeMatrixFloat(add(add(add(mul(b[9],a[7]),mul(b[10],a[11])),mul(b[11],a[15])),mul(b[8],a[3]))),
    storeMatrixFloat(add(add(add(mul(b[14],a[8]),mul(b[15],a[12])),mul(b[13],a[4])),mul(b[12],a[0]))),
    storeMatrixFloat(add(add(add(mul(b[14],a[9]),mul(b[12],a[1])),mul(b[13],a[5])),mul(b[15],a[13]))),
    storeMatrixFloat(add(add(add(mul(b[15],a[14]),mul(b[14],a[10])),mul(b[12],a[2])),mul(b[13],a[6]))),
    storeMatrixFloat(add(mul(b[12],a[3]),add(add(mul(b[14],a[11]),mul(b[13],a[7])),mul(b[15],a[15])))),
  ];
}
