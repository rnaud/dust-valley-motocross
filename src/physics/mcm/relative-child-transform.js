import {mcmInverseSqrt} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {multiplyMcmMatrices} from './matrix.js';
import {multiplyMcmMatrixPointers} from './matrix-pointer-product.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmPositionRelativeTo} from './position-transform.js';
const f=Math.fround;
const normalize=([x,y,z])=>{
 const inverse=f(mcmInverseSqrt(f((y*y+z*z)+x*x)));
 return [f(x*inverse),f(y*inverse),f(z*inverse)];
};
const transposeRotation=m=>{const r=[...m];for(const [a,b] of [[1,4],[2,8],[6,9]])[r[a],r[b]]=[r[b],r[a]];return r;};

// Original 0x4b7270 with orthogonalization disabled, as used by 0x44fa70.
// Mutates both axes, preserving the entry's binary32 normalization stores.
export function setMcmRelativeChildOrientation(node,reference,forward,up){
 const position=node.local.slice(12,15),u=normalize(up),v=normalize(forward);
 up.splice(0,3,...u);forward.splice(0,3,...v);
 const right=[f(u[1]*v[2]-u[2]*v[1]),f(u[2]*v[0]-u[0]*v[2]),f(u[0]*v[1]-u[1]*v[0])];
 let matrix=[...right,0,...u,0,...v,0,...position,1];
 if(reference===node)matrix=multiplyMcmMatrices(node.local,matrix);
 else{
  if(reference)matrix=multiplyMcmMatrices(resolveMcmWorldMatrix(reference),matrix);
  if(node.parent)matrix=transposeRotation(multiplyMcmMatrixPointers(transposeRotation(matrix),resolveMcmWorldMatrix(node.parent)));
  matrix.splice(12,3,...position);
 }
 node.local=matrix;invalidateMcmTransform(node);
}
// Original 0x44fa70 zero record+4 branch, after component-index lookup.
export function applyMcmRelativeChildTransform(body,node,record){
 setMcmRelativeChildOrientation(node,body,record.forward,record.up);
 setMcmPositionRelativeTo(node,body,record.position);
}
