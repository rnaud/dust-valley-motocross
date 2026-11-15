import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
// Original inline x87 product 0x44fb53..0x44feb6. Addition order is significant.
export function composeMcmWrapperProduct(camera,world){
 const f=Math.fround,out=new Float32Array(16);
out[0]=f(add(add(add(mul(camera[4],world[1]),mul(camera[8],world[2])),mul(camera[12],world[3])),mul(camera[0],world[0])));
out[1]=f(add(add(add(mul(camera[5],world[1]),mul(camera[9],world[2])),mul(camera[13],world[3])),mul(camera[1],world[0])));
out[2]=f(add(add(add(mul(camera[6],world[1]),mul(camera[10],world[2])),mul(camera[14],world[3])),mul(camera[2],world[0])));
out[3]=f(add(add(add(mul(camera[11],world[2]),mul(camera[15],world[3])),mul(camera[7],world[1])),mul(camera[3],world[0])));
out[4]=f(add(add(add(mul(camera[4],world[5]),mul(camera[8],world[6])),mul(camera[12],world[7])),mul(camera[0],world[4])));
out[5]=f(add(add(add(mul(camera[1],world[4]),mul(camera[5],world[5])),mul(camera[9],world[6])),mul(camera[13],world[7])));
out[6]=f(add(add(add(mul(camera[6],world[5]),mul(camera[10],world[6])),mul(camera[14],world[7])),mul(camera[2],world[4])));
out[7]=f(add(add(add(mul(camera[15],world[7]),mul(camera[11],world[6])),mul(camera[3],world[4])),mul(camera[7],world[5])));
out[8]=f(add(add(add(mul(camera[4],world[9]),mul(camera[8],world[10])),mul(camera[12],world[11])),mul(camera[0],world[8])));
out[9]=f(add(add(add(mul(camera[5],world[9]),mul(camera[1],world[8])),mul(camera[9],world[10])),mul(camera[13],world[11])));
out[10]=f(add(add(add(mul(camera[6],world[9]),mul(camera[10],world[10])),mul(camera[2],world[8])),mul(camera[14],world[11])));
out[11]=f(add(add(add(mul(camera[11],world[10]),mul(camera[15],world[11])),mul(camera[3],world[8])),mul(camera[7],world[9])));
out[12]=f(add(add(add(mul(camera[8],world[14]),mul(camera[12],world[15])),mul(camera[4],world[13])),mul(camera[0],world[12])));
out[13]=f(add(add(add(mul(camera[1],world[12]),mul(camera[5],world[13])),mul(camera[9],world[14])),mul(camera[13],world[15])));
out[14]=f(add(add(add(mul(camera[10],world[14]),mul(camera[14],world[15])),mul(camera[2],world[12])),mul(camera[6],world[13])));
out[15]=f(add(mul(camera[7],world[13]),add(add(mul(camera[15],world[15]),mul(camera[11],world[14])),mul(camera[3],world[12]))));
 return out;
}
