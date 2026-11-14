import {mcmInverseSqrt} from './inverse-sqrt.js';
import {mcmSinCos} from './x87-trig.js';
const f=Math.fround;
// Original 0x475760; eye, forward, up, roll are float32 inputs. The original
// normalizes forward/up independently and leaves their cross product unscaled.
// Isolated expression only; camera evolution and renderer scheduling are pending.
export function composeMcmViewMatrix(input){
 if(input.length!==10||!Array.from(input).every(Number.isFinite))throw new RangeError('Expected ten finite camera inputs');
 const a=Array.from(input,f),eye=a.slice(0,3);
 const normalize=v=>{const scale=mcmInverseSqrt(f((v[1]*v[1]+v[2]*v[2])+v[0]*v[0]));return v.map(x=>f(x*scale));};
 const forward=normalize(a.slice(3,6)),up=normalize(a.slice(6,9));
 const right=[f(up[1]*forward[2]-up[2]*forward[1]),f(up[2]*forward[0]-up[0]*forward[2]),f(up[0]*forward[1]-up[1]*forward[0])];
 const dot=v=>(v[0]*eye[0]+v[1]*eye[1])+v[2]*eye[2];
 const matrix=[right[0],up[0],forward[0],0,right[1],up[1],forward[1],0,right[2],up[2],forward[2],0,f(-dot(right)),f(-dot(up)),f(-dot(forward)),1];
 if(a[9]===0)return Float32Array.from(matrix);
 const trig=mcmSinCos(-a[9]),c=f(trig.cos),s=f(trig.sin);
 const rotation=[c,-s,0,0,s,c,0,0,0,0,1,0,0,0,0,1],result=new Float32Array(16);
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  let total=0;for(let k=0;k<4;k++)total+=rotation[k*4+col]*matrix[row*4+k];result[row*4+col]=f(total);
 }
 return result;
}
