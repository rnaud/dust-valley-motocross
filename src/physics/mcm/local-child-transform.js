import {mcmInverseSqrt} from './inverse-sqrt.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmPositionRelativeTo} from './position-transform.js';
const f=Math.fround;
const normalize=([x,y,z])=>{
 const inverse=mcmInverseSqrt(f((x*x+y*y)+z*z));
 return [f(x*inverse),f(y*inverse),f(z*inverse)];
};
// Original 0x4b7000 with orthogonalization disabled, as called by 0x44fa70.
// Unlike 0x4b7270, this routine retains the binary64 inverse-square-root value
// when scaling each component. Both input axis arrays are overwritten.
export function setMcmLocalChildOrientation(node,forward,up){
 const u=normalize(up),v=normalize(forward);
 up.splice(0,3,...u);forward.splice(0,3,...v);
 const right=[f(u[1]*v[2]-u[2]*v[1]),f(u[2]*v[0]-u[0]*v[2]),f(u[0]*v[1]-u[1]*v[0])];
 node.local=[...right,0,...u,0,...v,0,...node.local.slice(12,15),1];
 invalidateMcmTransform(node);
}
// Original 0x44fa70 nonzero record+4 branch, after the component-index lookup.
export function applyMcmLocalChildTransform(body,node,record){
 setMcmLocalChildOrientation(node,record.forward,record.up);
 setMcmPositionRelativeTo(node,body,record.position);
}
