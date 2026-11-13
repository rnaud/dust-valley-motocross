import {bitsFloat} from './math.js';
const x87Indefinite=bitsFloat(0xffc00000);
// Overflowed finite transforms can produce invalid arithmetic; x87 stores
// the negative indefinite NaN, unlike the host's default NaN sign.
const storeWorldFloat=value=>Number.isNaN(value)?x87Indefinite:Math.fround(value);

// Original 0x4b6930 parent/local composition; preserve x87 addition order.
export function composeMcmWorldMatrix(parent, local) {
  return [
    storeWorldFloat(((((parent[0] * local[0]) + (local[2] * parent[8])) + (local[3] * parent[12])) + (parent[4] * local[1]))),
    storeWorldFloat(((((local[2] * parent[9]) + (local[3] * parent[13])) + (parent[1] * local[0])) + (parent[5] * local[1]))),
    storeWorldFloat(((parent[6] * local[1]) + (((local[2] * parent[10]) + (local[3] * parent[14])) + (local[0] * parent[2])))),
    storeWorldFloat(((local[0] * parent[3]) + (((local[3] * parent[15]) + (local[2] * parent[11])) + (parent[7] * local[1])))),
    storeWorldFloat(((((parent[0] * local[4]) + (local[6] * parent[8])) + (local[7] * parent[12])) + (local[5] * parent[4]))),
    storeWorldFloat(((((local[6] * parent[9]) + (parent[1] * local[4])) + (parent[5] * local[5])) + (local[7] * parent[13]))),
    storeWorldFloat(((((local[6] * parent[10]) + (local[7] * parent[14])) + (local[4] * parent[2])) + (parent[6] * local[5]))),
    storeWorldFloat(((local[4] * parent[3]) + ((local[7] * parent[15]) + ((local[5] * parent[7]) + (local[6] * parent[11]))))),
    storeWorldFloat(((((parent[0] * local[8]) + (local[10] * parent[8])) + (local[11] * parent[12])) + (local[9] * parent[4]))),
    storeWorldFloat(((((local[10] * parent[9]) + (parent[1] * local[8])) + (parent[5] * local[9])) + (local[11] * parent[13]))),
    storeWorldFloat(((((local[11] * parent[14]) + (local[10] * parent[10])) + (local[8] * parent[2])) + (parent[6] * local[9]))),
    storeWorldFloat(((local[8] * parent[3]) + ((local[11] * parent[15]) + ((local[10] * parent[11]) + (local[9] * parent[7]))))),
    storeWorldFloat(((((parent[0] * local[12]) + (local[15] * parent[12])) + (local[13] * parent[4])) + (local[14] * parent[8]))),
    storeWorldFloat(((((parent[1] * local[12]) + (parent[5] * local[13])) + (parent[9] * local[14])) + (local[15] * parent[13]))),
    storeWorldFloat(((parent[10] * local[14]) + (((local[12] * parent[2]) + (local[15] * parent[14])) + (parent[6] * local[13])))),
    storeWorldFloat(((((parent[11] * local[14]) + (local[15] * parent[15])) + (local[13] * parent[7])) + (local[12] * parent[3]))),
  ];
}

// Original 0x4b8720, using the resolved world matrix at node+0xc4.
export function inverseRotateMcmVector(matrix, vector) {
  return [
    Math.fround((((matrix[1] * vector[1]) + (matrix[2] * vector[2])) + (matrix[0] * vector[0]))),
    Math.fround((((matrix[6] * vector[2]) + (matrix[5] * vector[1])) + (matrix[4] * vector[0]))),
    Math.fround((((matrix[9] * vector[1]) + (matrix[10] * vector[2])) + (matrix[8] * vector[0]))),
  ];
}

// Original node+0x104 is a valid-cache flag; node+0x108 points to its parent.
export function resolveMcmWorldMatrix(node) {
  if (!node.cacheValid) {
    node.world = node.parent
      ? composeMcmWorldMatrix(resolveMcmWorldMatrix(node.parent),node.local)
      : [...node.local];
    node.cacheValid = 1;
  }
  return node.world;
}
