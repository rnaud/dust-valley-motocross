import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround,belowZero=v=>Number.isNaN(v)||v<0;
function integer(v){const lo=Math.floor(v),fraction=v-lo,n=fraction<.5?lo:fraction>.5?lo+1:lo%2===0?lo:lo+1;return !Number.isFinite(n)||n< -2147483648||n>2147483647?-2147483648:n;}
// Original 0x47e8a0, including optional rectangle/count outputs.
export function projectMcmBounds({matrix,center,extent,viewport,rect=[0,0,0,0],count=0,wantRect=true,wantCount=false}){
 const empty=()=>Array.from({length:8},()=>new Float32Array(4));
 if(!wantRect&&!wantCount){
  const p=Float64Array.from({length:4},(_,c)=>{const x=mul(matrix[c],center[0]),y=mul(matrix[4+c],center[1]),z=mul(matrix[8+c],center[2]);return add(c===3?add(add(x,z),y):add(add(z,y),x),matrix[12+c]);});
  const w=f(p[3]);let code=0;
  for(const [c,low,high]of [[0,1,2],[1,4,8],[2,16,32]]){if(belowZero(p[c]))code|=low;else if(belowZero(sub(w,f(p[c]))))code|=high;}
  if(!code)return {accepted:1,rect:rect.slice(),count,corners:empty()};
 }
 const parts=Array.from({length:3},(_,axis)=>Array.from({length:2},(_,side)=>{const v=side?add(center[axis],extent[axis]):sub(center[axis],extent[axis]);return Float32Array.from({length:4},(_,c)=>f(mul(matrix[axis*4+c],v)));}));
 const corners=[];let common=63,inside=0;
 for(let i=0;i<8;i++){
  const x=parts[0][i&1],y=parts[1][(i>>1)&1],z=parts[2][i>>2];
  const point=Float32Array.from({length:4},(_,c)=>f(add(c===1?add(add(y[c],x[c]),z[c]):add(add(z[c],y[c]),x[c]),matrix[12+c])));corners.push(point);
  let code=0;for(const [c,low,high]of [[0,1,2],[1,4,8],[2,16,32]]){if(floatBits(point[c])>0x80000000)code|=low;else if(belowZero(sub(point[3],point[c])))code|=high;}
  if(!code&&!wantRect&&!wantCount){while(corners.length<8)corners.push(new Float32Array(4));return {accepted:1,rect:rect.slice(),count,corners};}
  common&=code;if(!code)inside++;
 }
 if(common)return {accepted:0,rect:wantRect?[0,0,0,0]:rect.slice(),count,corners};
 const result=rect.slice();if(wantRect){
  const width=viewport[2]>>>0,height=viewport[3]>>>0;
  for(let i=0;i<8;i++){const p=corners[i],reciprocal=i?div(1,p[3]):f(div(1,p[3]));p[0]=f(mul(mul(width,p[0]),reciprocal));p[1]=f(mul(mul(height,p[1]),reciprocal));
   if(!i){result[0]=result[2]=integer(p[0]);result[1]=result[3]=integer(p[1]);}
   else {if(result[0]>p[0])result[0]=integer(p[0]);else if(belowZero(sub(result[2],p[0])))result[2]=integer(p[0]);if(result[1]>p[1])result[1]=integer(p[1]);else if(belowZero(sub(result[3],p[1])))result[3]=integer(p[1]);}
  }
  result[0]=((result[0]>0?result[0]:0)+(viewport[0]|0))|0;result[1]=((result[1]>0?result[1]:0)+(viewport[1]|0))|0;
  result[2]=((result[2]<(width|0)?result[2]:width)+(viewport[0]|0))|0;result[3]=((result[3]<(height|0)?result[3]:height)+(viewport[1]|0))|0;
 }
 return {accepted:1,rect:result,count:wantCount?inside:count,corners};
}
