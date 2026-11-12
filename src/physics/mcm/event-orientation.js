import {mcmInverseSqrt} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

const f=Math.fround;
const cross=(a,b)=>[f(a[1]*b[2]-a[2]*b[1]),f(a[2]*b[0]-a[0]*b[2]),f(a[0]*b[1]-a[1]*b[0])];
const normalize=v=>{
 const inverse=f(mcmInverseSqrt(f((v[1]*v[1]+v[2]*v[2])+v[0]*v[0])));
 return v.map(x=>f(x*inverse));
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
// 0x4b7270(target, null, forward, up, true). Root target, nondegenerate axes.
// Source may have a parent; world-cache resolution preserves original semantics.
export function alignMcmEventRootOrientation(source,target){
 if(target.parent)throw new RangeError('Event orientation currently requires a root target');
 const world=resolveMcmWorldMatrix(source);
 let forward=world.slice(8,11),up=world.slice(4,7);
 up=cross(forward,cross(up,forward));
 up=normalize(up);forward=normalize(forward);
 const right=cross(up,forward),position=target.local.slice(12,15);
 target.local=[...right,0,...up,0,...forward,0,...position,1];
 invalidateMcmTransform(target);
 return {forward,up};
}
