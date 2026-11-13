import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
// Typed scratch preserves x87 NaN signs before callers copy into mutable matrices.
// Original pointer-argument matrix product 0x4b9bb0. Each sum follows x87 order.
export function multiplyMcmMatrixPointers(a,b){
 const result=new Float64Array(16);
  result[0]=Math.fround(add(add(add(mul(b[0],a[0]),mul(b[1],a[4])),mul(b[2],a[8])),mul(b[3],a[12])));
  result[1]=Math.fround(add(add(add(mul(b[0],a[1]),mul(a[5],b[1])),mul(a[9],b[2])),mul(b[3],a[13])));
  result[2]=Math.fround(add(add(add(mul(b[0],a[2]),mul(a[10],b[2])),mul(a[14],b[3])),mul(b[1],a[6])));
  result[3]=Math.fround(add(add(add(mul(b[0],a[3]),mul(b[1],a[7])),mul(b[2],a[11])),mul(a[15],b[3])));
  result[4]=Math.fround(add(add(add(mul(a[0],b[4]),mul(b[5],a[4])),mul(b[6],a[8])),mul(b[7],a[12])));
  result[5]=Math.fround(add(add(add(mul(b[5],a[5]),mul(a[9],b[6])),mul(a[1],b[4])),mul(b[7],a[13])));
  result[6]=Math.fround(add(add(add(mul(a[14],b[7]),mul(b[5],a[6])),mul(a[10],b[6])),mul(b[4],a[2])));
  result[7]=Math.fround(add(add(add(mul(b[5],a[7]),mul(b[6],a[11])),mul(a[15],b[7])),mul(a[3],b[4])));
  result[8]=Math.fround(add(add(add(mul(a[0],b[8]),mul(b[9],a[4])),mul(b[10],a[8])),mul(b[11],a[12])));
  result[9]=Math.fround(add(add(add(mul(b[9],a[5]),mul(a[9],b[10])),mul(a[1],b[8])),mul(b[11],a[13])));
  result[10]=Math.fround(add(add(add(mul(a[14],b[11]),mul(b[9],a[6])),mul(b[10],a[10])),mul(b[8],a[2])));
  result[11]=Math.fround(add(add(add(mul(b[10],a[11]),mul(b[9],a[7])),mul(a[15],b[11])),mul(a[3],b[8])));
  result[12]=Math.fround(add(add(add(mul(a[0],b[12]),mul(a[4],b[13])),mul(b[14],a[8])),mul(a[12],b[15])));
  result[13]=Math.fround(add(add(add(mul(a[9],b[14]),mul(a[1],b[12])),mul(a[5],b[13])),mul(a[13],b[15])));
  result[14]=Math.fround(add(add(add(mul(b[14],a[10]),mul(a[14],b[15])),mul(a[6],b[13])),mul(b[12],a[2])));
  result[15]=Math.fround(add(add(add(mul(b[14],a[11]),mul(a[3],b[12])),mul(a[7],b[13])),mul(a[15],b[15])));
  return result;
}
