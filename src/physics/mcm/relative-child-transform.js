import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {multiplyMcmMatrices} from './matrix.js';
import {multiplyMcmMatrixPointers} from './matrix-pointer-product.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmPositionRelativeTo} from './position-transform.js';
import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;
const normalize=([x,y,z])=>{
 const inverse=f(mcmInverseSqrt(f(add(add(mul(y,y),mul(z,z)),mul(x,x)))));
 const result=new Float64Array(3);result[0]=f(mul(x,inverse));result[1]=f(mul(y,inverse));result[2]=f(mul(z,inverse));return result;
};
// Preserve NaN signs while retaining the mutable array matrix contract.
const transposeRotation=m=>{const r=new Array(16).fill(.1),indices=[0,4,8,3,1,5,9,7,2,6,10,11,12,13,14,15];for(let i=0;i<16;i++)r[i]=Math.fround(m[indices[i]]);return r;};

// Original 0x4b7270 with orthogonalization disabled, as used by 0x44fa70.
// Mutates both axes, preserving the entry's binary32 normalization stores.
export function setMcmRelativeChildOrientation(node,reference,forward,up){
 const position=node.local.slice(12,15),u=normalize(up),v=normalize(forward);
 for(let i=0;i<3;i++){up[i]=u[i];forward[i]=v[i];}
 const right=new Float64Array(3);right[0]=f(sub(mul(u[1],v[2]),mul(u[2],v[1])));right[1]=f(sub(mul(u[2],v[0]),mul(u[0],v[2])));right[2]=f(sub(mul(u[0],v[1]),mul(u[1],v[0])));
 let matrix=new Array(16).fill(.1);for(let i=0;i<3;i++){matrix[i]=right[i];matrix[4+i]=u[i];matrix[8+i]=v[i];matrix[12+i]=position[i];}matrix[3]=matrix[7]=matrix[11]=0;matrix[15]=1;
 if(reference===node)matrix=multiplyMcmMatrices(node.local,matrix);
 else{
  if(reference)matrix=multiplyMcmMatrices(resolveMcmWorldMatrix(reference),matrix);
  if(node.parent)matrix=transposeRotation(multiplyMcmMatrixPointers(transposeRotation(matrix),resolveMcmWorldMatrix(node.parent)));
  for(let i=0;i<3;i++)matrix[12+i]=position[i];
 }
 node.local=matrix;invalidateMcmTransform(node);
}
// Original 0x44fa70 zero record+4 branch, after component-index lookup.
export function applyMcmRelativeChildTransform(body,node,record){
 setMcmRelativeChildOrientation(node,body,record.forward,record.up);
 setMcmPositionRelativeTo(node,body,record.position);
}
