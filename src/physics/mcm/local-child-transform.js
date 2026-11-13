import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmPositionRelativeTo} from './position-transform.js';
import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;
const normalize=([x,y,z])=>{
 const inverse=mcmInverseSqrt(f(add(add(mul(x,x),mul(y,y)),mul(z,z))));
 const result=new Float64Array(3);result[0]=f(mul(x,inverse));result[1]=f(mul(y,inverse));result[2]=f(mul(z,inverse));return result;
};
// Original 0x4b7000 with orthogonalization disabled, as called by 0x44fa70.
// Unlike 0x4b7270, this routine retains the binary64 inverse-square-root value
// when scaling each component. Both input axis arrays are overwritten.
export function setMcmLocalChildOrientation(node,forward,up){
 const u=normalize(up),v=normalize(forward);
 for(let i=0;i<3;i++){up[i]=u[i];forward[i]=v[i];}
 const right=new Float64Array(3);right[0]=f(sub(mul(u[1],v[2]),mul(u[2],v[1])));right[1]=f(sub(mul(u[2],v[0]),mul(u[0],v[2])));right[2]=f(sub(mul(u[0],v[1]),mul(u[1],v[0])));
 const matrix=new Array(16).fill(.1);for(let i=0;i<3;i++){matrix[i]=right[i];matrix[4+i]=u[i];matrix[8+i]=v[i];matrix[12+i]=node.local[12+i];}matrix[3]=matrix[7]=matrix[11]=0;matrix[15]=1;node.local=matrix;
 invalidateMcmTransform(node);
}
// Original 0x44fa70 nonzero record+4 branch, after the component-index lookup.
export function applyMcmLocalChildTransform(body,node,record){
 setMcmLocalChildOrientation(node,record.forward,record.up);
 setMcmPositionRelativeTo(node,body,record.position);
}
