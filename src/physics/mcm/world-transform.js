import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
const storeWorldFloat=Math.fround;

// Original 0x4b6930 parent/local composition; preserve x87 addition order.
export function composeMcmWorldMatrix(parent, local) {
  const result=Array(16).fill(.1);
  result[0]=storeWorldFloat(add(add(add(mul(parent[0],local[0]),mul(local[2],parent[8])),mul(local[3],parent[12])),mul(parent[4],local[1])));
  result[1]=storeWorldFloat(add(add(add(mul(local[2],parent[9]),mul(local[3],parent[13])),mul(parent[1],local[0])),mul(parent[5],local[1])));
  result[2]=storeWorldFloat(add(mul(parent[6],local[1]),add(add(mul(local[2],parent[10]),mul(local[3],parent[14])),mul(local[0],parent[2]))));
  result[3]=storeWorldFloat(add(mul(local[0],parent[3]),add(add(mul(local[3],parent[15]),mul(local[2],parent[11])),mul(parent[7],local[1]))));
  result[4]=storeWorldFloat(add(add(add(mul(parent[0],local[4]),mul(local[6],parent[8])),mul(local[7],parent[12])),mul(local[5],parent[4])));
  result[5]=storeWorldFloat(add(add(add(mul(local[6],parent[9]),mul(parent[1],local[4])),mul(parent[5],local[5])),mul(local[7],parent[13])));
  result[6]=storeWorldFloat(add(add(add(mul(local[6],parent[10]),mul(local[7],parent[14])),mul(local[4],parent[2])),mul(parent[6],local[5])));
  result[7]=storeWorldFloat(add(mul(local[4],parent[3]),add(mul(local[7],parent[15]),add(mul(local[5],parent[7]),mul(local[6],parent[11])))));
  result[8]=storeWorldFloat(add(add(add(mul(parent[0],local[8]),mul(local[10],parent[8])),mul(local[11],parent[12])),mul(local[9],parent[4])));
  result[9]=storeWorldFloat(add(add(add(mul(local[10],parent[9]),mul(parent[1],local[8])),mul(parent[5],local[9])),mul(local[11],parent[13])));
  result[10]=storeWorldFloat(add(add(add(mul(local[11],parent[14]),mul(local[10],parent[10])),mul(local[8],parent[2])),mul(parent[6],local[9])));
  result[11]=storeWorldFloat(add(mul(local[8],parent[3]),add(mul(local[11],parent[15]),add(mul(local[10],parent[11]),mul(local[9],parent[7])))));
  result[12]=storeWorldFloat(add(add(add(mul(parent[0],local[12]),mul(local[15],parent[12])),mul(local[13],parent[4])),mul(local[14],parent[8])));
  result[13]=storeWorldFloat(add(add(add(mul(parent[1],local[12]),mul(parent[5],local[13])),mul(parent[9],local[14])),mul(local[15],parent[13])));
  result[14]=storeWorldFloat(add(mul(parent[10],local[14]),add(add(mul(local[12],parent[2]),mul(local[15],parent[14])),mul(parent[6],local[13]))));
  result[15]=storeWorldFloat(add(add(add(mul(parent[11],local[14]),mul(local[15],parent[15])),mul(local[13],parent[7])),mul(local[12],parent[3])));
  return result;
}

// Original 0x4b8720, using the resolved world matrix at node+0xc4.
export function inverseRotateMcmVector(matrix, vector) {
  const result=new Float64Array(3);
  result[0]=Math.fround(add(add(mul(matrix[1],vector[1]),mul(matrix[2],vector[2])),mul(matrix[0],vector[0])));
  result[1]=Math.fround(add(add(mul(matrix[6],vector[2]),mul(matrix[5],vector[1])),mul(matrix[4],vector[0])));
  result[2]=Math.fround(add(add(mul(matrix[9],vector[1]),mul(matrix[10],vector[2])),mul(matrix[8],vector[0])));
  return result;
}

// Original node+0x104 is a valid-cache flag; node+0x108 points to its parent.
export function resolveMcmWorldMatrix(node) {
  if (!node.cacheValid) {
    node.world = node.parent
      ? composeMcmWorldMatrix(resolveMcmWorldMatrix(node.parent),node.local)
      : copyLocalMatrix(node.local);
    node.cacheValid = 1;
  }
  return node.world;
}

function copyLocalMatrix(local){const result=Array(16).fill(.1);for(let i=0;i<16;i++)result[i]=local[i];return result;}
