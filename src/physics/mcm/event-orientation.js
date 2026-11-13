import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
import {multiplyMcmMatrixPointers} from './matrix-pointer-product.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

const f=Math.fround;
// Typed scratch preserves negative x87 NaNs in cold and optimized execution.
// Ordinary array intermediates can canonicalize them before normalization.
const cross=(a,b)=>{const r=new Float64Array(3);r[0]=f(sub(mul(a[1],b[2]),mul(a[2],b[1])));r[1]=f(sub(mul(a[2],b[0]),mul(a[0],b[2])));r[2]=f(sub(mul(a[0],b[1]),mul(a[1],b[0])));return r;};
const normalize=v=>{
 const inverse=f(mcmInverseSqrtLookup(f(add(add(mul(v[1],v[1]),mul(v[2],v[2])),mul(v[0],v[0])))));
 const result=new Float64Array(3);
 for(let i=0;i<3;i++)result[i]=f(mul(v[i],inverse));
 return result;
};
// Original 0x4b6d00 / 0x4b6d30. An already-invalid node skips its descendants.
export function invalidateMcmTransform(node){
 if(!node.cacheValid)return;
 node.cacheValid=0;
 const visit=n=>{
  if(n.nextSibling)visit(n.nextSibling);
  if(n.cacheValid){n.cacheValid=0;if(n.firstChild)visit(n.firstChild);}
 };
 if(node.firstChild)visit(node.firstChild);
}

// The exact event call pair: 0x4b7640(source, null, forward, up), then
// 0x4b7270(target, null, forward, up, true). Root or parented target.
// Source may have a parent; world-cache resolution preserves original semantics.
export function alignMcmEventRootOrientation(source,target){

 const world=resolveMcmWorldMatrix(source);
 let forward=new Float64Array(3),up=new Float64Array(3);
 for(let i=0;i<3;i++){forward[i]=world[8+i];up[i]=world[4+i];}
 up=cross(forward,cross(up,forward));
 up=normalize(up);forward=normalize(forward);
 const right=cross(up,forward),position=target.local.slice(12,15);
 let matrix=new Float64Array(16);
 for(let i=0;i<3;i++){matrix[i]=right[i];matrix[4+i]=up[i];matrix[8+i]=forward[i];matrix[12+i]=position[i];}
 matrix[3]=matrix[7]=matrix[11]=0;matrix[15]=1;
 if(target.parent){
  // Preallocate double elements: swapping boxed NaNs can canonicalize signs.
  const transpose=m=>{const r=new Float64Array(16),indices=[0,4,8,3,1,5,9,7,2,6,10,11,12,13,14,15];for(let i=0;i<16;i++)r[i]=Math.fround(m[indices[i]]);return r;};
  matrix=transpose(multiplyMcmMatrixPointers(transpose(matrix),resolveMcmWorldMatrix(target.parent)));for(let i=0;i<3;i++)matrix[12+i]=position[i];
 }
 const local=new Array(16).fill(.1);for(let i=0;i<16;i++)local[i]=matrix[i];
 target.local=local;
 invalidateMcmTransform(target);
 return {forward,up};
}
