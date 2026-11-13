import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {multiplyMcmMatrixPointers} from './matrix-pointer-product.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround;
const transposeRotation=m=>{const r=[...m];for(const [a,b] of [[1,4],[2,8],[6,9]])[r[a],r[b]]=[r[b],r[a]];return r;};

// Original 0x4b6d70 with null reference, as used by main-update proxy sync.
export function setMcmWorldMatrix(node,matrix){
 if(!node.parent)node.local=[...matrix];
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
 const matrix=[...resolveMcmWorldMatrix(source)];
 setMcmWorldMatrix(target,matrix);
 return matrix;
}
