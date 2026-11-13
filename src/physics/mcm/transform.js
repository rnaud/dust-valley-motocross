import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {multiplyMcmMatrices} from './matrix.js';
import {mcmAxisAngleMatrix} from './axis-angle.js';

// 0x4b7d90: rotate the local matrix while preserving its translation.
export function rotateMcmTransform(matrix, axis, angle) {
  const result = multiplyMcmMatrices(matrix, mcmAxisAngleMatrix(axis, angle));
  result.splice(12, 3, ...matrix.slice(12, 15));
  return result;
}

// 0x4b8070: move to the transformed pivot, rotate, then move back.
// Each translation uses its own original addition order and float32 stores.
export function rotateMcmTransformAtPivot(matrix, pivot, axis, angle) {
  // Indexed typed stores preserve NaN signs when the x64 JIT updates the copy.
  const p = pivot, m = new Float64Array(16);
  for(let i=0;i<16;i++)m[i]=matrix[i];
  m[12] = Math.fround(add(add(add(mul(m[8],p[2]),mul(m[0],p[0])),mul(m[4],p[1])),m[12]));
  m[13] = Math.fround(add(add(add(mul(m[9],p[2]),mul(m[5],p[1])),mul(m[1],p[0])),m[13]));
  m[14] = Math.fround(add(add(add(mul(m[10],p[2]),mul(m[6],p[1])),mul(m[2],p[0])),m[14]));
  // Typed translation stores retain x87 NaN signs in cold and optimized execution.
  const r = new Float64Array(rotateMcmTransform(m, axis, angle));
  const x = Math.fround(-p[0]), y = Math.fround(-p[1]), z = Math.fround(-p[2]);
  r[12] = Math.fround(add(add(add(mul(-p[2],r[8]),mul(r[0],x)),mul(r[4],y)),r[12]));
  r[13] = Math.fround(add(add(add(mul(r[5],y),mul(r[1],x)),mul(r[9],z)),r[13]));
  r[14] = Math.fround(add(add(mul(r[2],x),add(mul(r[10],z),mul(r[6],y))),r[14]));
  const result=new Array(16).fill(.1);
  for(let i=0;i<16;i++)result[i]=r[i];
  return result;
}
