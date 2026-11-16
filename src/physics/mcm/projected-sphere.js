import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
import {floatBits} from './math.js';
const f=Math.fround,less=(a,b)=>Number.isNaN(a)||Number.isNaN(b)||a<b;
// Original 47f620: camera-space depth plus screen-space conservative radius.
export function projectMcmSphere({camera,matrix,center,radius,wantInside=false,inside=0}){
 const c=o=>camera.getFloat32(o,true),[x,y,z]=center;
 const reject=()=>({accepted:0,inside:wantInside?0:inside});
 const rawZ=add(add(add(mul(c(0x98),z),mul(c(0x88),y)),mul(c(0x78),x)),c(0xa8)),depth=f(rawZ);
 const rawLow=sub(rawZ,radius),low=f(rawLow);if(rawLow>c(0x1ac))return reject();
 const rawHigh=add(radius,depth),high=f(rawHigh);if(less(rawHigh,c(0x1a8)))return reject();
 const clipped=less(c(0x1ac),high)||c(0x1a8)>low;
 const margin=f(add(add(mul(add(c(0xf0),c(0x100)),radius),mul(c(0x110),depth)),c(0x120)));
 const w=f(add(add(add(mul(matrix[11],z),mul(matrix[7],y)),mul(matrix[3],x)),matrix[15]));
 const rawX=add(add(add(mul(matrix[4],y),mul(matrix[8],z)),mul(matrix[0],x)),matrix[12]);
 const maxX=f(add(rawX,margin));if(less(add(rawX,margin),0))return reject();
 const rawMinX=sub(f(rawX),margin),minX=f(rawMinX);if(rawMinX>w)return reject();
 const rawY=add(add(add(mul(matrix[9],z),mul(matrix[5],y)),mul(matrix[1],x)),matrix[13]);
 const maxY=f(add(rawY,margin));if(less(add(rawY,margin),0))return reject();
 const rawMinY=sub(f(rawY),margin),minY=f(rawMinY);if(rawMinY>w)return reject();
 if(wantInside)inside=!clipped&&floatBits(minX)<=0x80000000&&!(maxX>w)&&floatBits(minY)<=0x80000000&&!(maxY>w)?1:0;
 return{accepted:1,inside};
}
