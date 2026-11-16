import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround;
// Original 0x47e650: homogeneous clipping and optional screen projection.
// Width/height are unsigned camera+180/+184. Clip comparisons happen before
// storing each coordinate as float, as in the original x87 instruction stream.
export function projectMcmCameraPoint(matrix,point,width,height,{screen=true}={}){
 const m=Float32Array.from(matrix),p=Float32Array.from(point);
 const w=f(add(add(add(mul(m[3],p[0]),mul(m[7],p[1])),mul(m[11],p[2])),m[15]));
 let flags=0;
 const coordinates=[0,1,2].map((i)=>{
  const value=add(add(add(mul(m[4+i],p[1]),mul(m[8+i],p[2])),mul(m[i],p[0])),m[12+i]);
  const stored=f(value);
  if(value<0||Number.isNaN(value))flags|=1<<(i*2);
  else if(sub(w,stored)<0||Number.isNaN(sub(w,stored)))flags|=2<<(i*2);
  return stored;
 });
 const result={visible:flags===0?1:0,flags};
 if(screen){const reciprocal=div(1,w);result.screen=Float32Array.from(coordinates,(value,i)=>f(mul(mul(i===0?width>>>0:height>>>0,value),reciprocal)));}
 return result;
}
