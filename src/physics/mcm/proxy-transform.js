import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {multiplyMcmMatrixPointers} from './matrix-pointer-product.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround;
const copyMatrix=m=>{const r=Array(16).fill(.1);for(let i=0;i<16;i++)r[i]=m[i];return r;};
const transposeRotation=m=>{const r=Array(16).fill(.1),indices=[0,4,8,3,1,5,9,7,2,6,10,11,12,13,14,15];for(let i=0;i<16;i++)r[i]=m[indices[i]];return r;};

// Original 0x4b6d70 with null reference, as used by main-update proxy sync.
export function setMcmWorldMatrix(node,matrix){
 if(!node.parent)node.local=copyMatrix(matrix);
 else{
  const p=resolveMcmWorldMatrix(node.parent);
  const x=f(sub(matrix[12],p[12])),y=f(sub(matrix[13],p[13])),z=f(sub(matrix[14],p[14]));
  node.local=transposeRotation(multiplyMcmMatrixPointers(transposeRotation(matrix),p));
  node.local[12]=f(add(add(mul(p[2],z),mul(p[1],y)),mul(p[0],x)));
  node.local[13]=f(add(add(mul(p[6],z),mul(p[5],y)),mul(p[4],x)));
  node.local[14]=f(add(mul(p[8],x),add(mul(p[10],z),mul(p[9],y))));
 }
 invalidateMcmTransform(node);
}
// Original 0x4b7a20(null) followed by 0x4b6d70(null). Keep the source copy:
// resolving the destination parent may touch the same transform graph.
export function synchronizeMcmProxyTransform(source,target){
 const matrix=copyMatrix(resolveMcmWorldMatrix(source));
 setMcmWorldMatrix(target,matrix);
 return matrix;
}
