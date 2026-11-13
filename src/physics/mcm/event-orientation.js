import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
import {multiplyMcmMatrixPointers} from './matrix-pointer-product.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

const f=Math.fround;
const cross=(a,b)=>[f(sub(mul(a[1],b[2]),mul(a[2],b[1]))),f(sub(mul(a[2],b[0]),mul(a[0],b[2]))),f(sub(mul(a[0],b[1]),mul(a[1],b[0])))];
const normalize=v=>{
 const inverse=f(mcmInverseSqrtLookup(f((v[1]*v[1]+v[2]*v[2])+v[0]*v[0])));
 return v.map(x=>f(mul(x,inverse)));
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
 let forward=world.slice(8,11),up=world.slice(4,7);
 up=cross(forward,cross(up,forward));
 up=normalize(up);forward=normalize(forward);
 const right=cross(up,forward),position=target.local.slice(12,15);
 let matrix=[...right,0,...up,0,...forward,0,...position,1];
 if(target.parent){
  const transpose=m=>{const r=[...m];for(const [a,b] of [[1,4],[2,8],[6,9]])[r[a],r[b]]=[r[b],r[a]];return r;};
  matrix=transpose(multiplyMcmMatrixPointers(transpose(matrix),resolveMcmWorldMatrix(target.parent)));matrix.splice(12,3,...position);
 }
 target.local=matrix;
 invalidateMcmTransform(target);
 return {forward,up};
}
