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
  const p = pivot, m = [...matrix];
  m[12] = Math.fround(((m[8]*p[2] + m[0]*p[0]) + m[4]*p[1]) + m[12]);
  m[13] = Math.fround(((m[9]*p[2] + m[5]*p[1]) + m[1]*p[0]) + m[13]);
  m[14] = Math.fround(((m[10]*p[2] + m[6]*p[1]) + m[2]*p[0]) + m[14]);
  const r = rotateMcmTransform(m, axis, angle);
  const x = Math.fround(-p[0]), y = Math.fround(-p[1]), z = Math.fround(-p[2]);
  r[12] = Math.fround(((-p[2]*r[8] + r[0]*x) + r[4]*y) + r[12]);
  r[13] = Math.fround(((r[5]*y + r[1]*x) + r[9]*z) + r[13]);
  r[14] = Math.fround((r[2]*x + (r[10]*z + r[6]*y)) + r[14]);
  return r;
}
