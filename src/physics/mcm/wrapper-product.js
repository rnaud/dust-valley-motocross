import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
// Original inline x87 product 0x44fb53..0x44feb6. Addition order is significant.
export function composeMcmWrapperProduct(camera,local){
 const f=Math.fround,out=new Float32Array(16);
out[0]=f(add(add(add(mul(camera[4],local[1]),mul(camera[8],local[2])),mul(camera[12],local[3])),mul(camera[0],local[0])));
out[1]=f(add(add(add(mul(camera[5],local[1]),mul(camera[9],local[2])),mul(camera[13],local[3])),mul(camera[1],local[0])));
out[2]=f(add(add(add(mul(camera[6],local[1]),mul(camera[10],local[2])),mul(camera[14],local[3])),mul(camera[2],local[0])));
out[3]=f(add(add(add(mul(camera[11],local[2]),mul(camera[15],local[3])),mul(camera[7],local[1])),mul(camera[3],local[0])));
out[4]=f(add(add(add(mul(camera[4],local[5]),mul(camera[8],local[6])),mul(camera[12],local[7])),mul(camera[0],local[4])));
out[5]=f(add(add(add(mul(camera[1],local[4]),mul(camera[5],local[5])),mul(camera[9],local[6])),mul(camera[13],local[7])));
out[6]=f(add(add(add(mul(camera[6],local[5]),mul(camera[10],local[6])),mul(camera[14],local[7])),mul(camera[2],local[4])));
out[7]=f(add(add(add(mul(camera[15],local[7]),mul(camera[11],local[6])),mul(camera[3],local[4])),mul(camera[7],local[5])));
out[8]=f(add(add(add(mul(camera[4],local[9]),mul(camera[8],local[10])),mul(camera[12],local[11])),mul(camera[0],local[8])));
out[9]=f(add(add(add(mul(camera[5],local[9]),mul(camera[1],local[8])),mul(camera[9],local[10])),mul(camera[13],local[11])));
out[10]=f(add(add(add(mul(camera[6],local[9]),mul(camera[10],local[10])),mul(camera[2],local[8])),mul(camera[14],local[11])));
out[11]=f(add(add(add(mul(camera[11],local[10]),mul(camera[15],local[11])),mul(camera[3],local[8])),mul(camera[7],local[9])));
out[12]=f(add(add(add(mul(camera[8],local[14]),mul(camera[12],local[15])),mul(camera[4],local[13])),mul(camera[0],local[12])));
out[13]=f(add(add(add(mul(camera[1],local[12]),mul(camera[5],local[13])),mul(camera[9],local[14])),mul(camera[13],local[15])));
out[14]=f(add(add(add(mul(camera[10],local[14]),mul(camera[14],local[15])),mul(camera[2],local[12])),mul(camera[6],local[13])));
out[15]=f(add(mul(camera[7],local[13]),add(add(mul(camera[15],local[15]),mul(camera[11],local[14])),mul(camera[3],local[12]))));
 return out;
}
