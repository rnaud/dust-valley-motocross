import {resolveMcmWorldMatrix} from './world-transform.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;
function exceptionalPoint(m,x,y,z){
 return [0,1,2].map(i=>f(add(add(add(mul(m[8+i],z),mul(m[i],x)),mul(m[4+i],y)),m[12+i])));
}
function exceptionalInversePoint(m,x,y,z){
 const tx=f(-add(add(mul(m[14],m[2]),mul(m[1],m[13])),mul(m[12],m[0])));
 const ty=f(-add(add(mul(m[14],m[6]),mul(m[4],m[12])),mul(m[13],m[5])));
 const tz=f(-add(add(mul(m[8],m[12]),mul(m[14],m[10])),mul(m[9],m[13])));
 // Typed stores preserve NaN sign when V8 optimizes array construction.
 const result=new Float64Array(3);
 result[0]=f(add(add(add(mul(y,m[1]),mul(z,m[2])),mul(x,m[0])),tx));
 result[1]=f(add(add(add(mul(m[6],z),mul(m[5],y)),mul(m[4],x)),ty));
 result[2]=f(add(add(add(mul(m[9],y),mul(m[10],z)),mul(m[8],x)),tz));
 return result;
}


// Original 0x4b8660, including its x87 addition order.
export function transformMcmPoint(m,[x,y,z]){
 if(!m.every(Number.isFinite)||![x,y,z].every(Number.isFinite))return exceptionalPoint(m,x,y,z);
 return [f(((m[8]*z+m[0]*x)+m[4]*y)+m[12]),f(((m[9]*z+m[1]*x)+m[5]*y)+m[13]),f(((m[10]*z+m[2]*x)+m[6]*y)+m[14])];
}
// Original 0x4b8810: transpose rotation, store inverse translation as float32,
// then transform the point. This is the original rigid inverse, not a general
// matrix inverse for scaled/sheared transforms.
export function inverseTransformMcmPoint(m,[x,y,z]){
 if(!m.every(Number.isFinite)||![x,y,z].every(Number.isFinite))return exceptionalInversePoint(m,x,y,z);
 const tx=f(-((m[14]*m[2]+m[1]*m[13])+m[12]*m[0]));
 const ty=f(-((m[14]*m[6]+m[4]*m[12])+m[13]*m[5]));
 const tz=f(-((m[8]*m[12]+m[14]*m[10])+m[9]*m[13]));
 return [f(((y*m[1]+z*m[2])+x*m[0])+tx),f(((m[6]*z+m[5]*y)+m[4]*x)+ty),f(((m[9]*y+m[10]*z)+m[8]*x)+tz)];
}

// Original pointer/scalar entry points 0x4b7860 / 0x4b77a0 share this behavior.
export function setMcmPositionRelativeTo(node,reference,position){
 let local=[...position];
 if(reference===node)local=local.map((v,i)=>f(v+node.local[12+i]));
 else if(reference){
  if(!node.parent)throw new RangeError('Original relative-position conversion requires a parent');
  local=transformMcmPoint(resolveMcmWorldMatrix(reference),local);
  local=inverseTransformMcmPoint(resolveMcmWorldMatrix(node.parent),local);
 }
 node.local.splice(12,3,...local);invalidateMcmTransform(node);
}
