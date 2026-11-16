import {multiplyWineRenderMatrix} from './wine-render-matrix.js';
import {bitsFloat} from './math.js';
const f=Math.fround;
function scalar(a,b,op){if(Number.isNaN(a))return a;if(Number.isNaN(b))return b;const n=op(a,b);return Number.isNaN(n)?bitsFloat(0xffc00000):f(n);}
const add=(a,b)=>scalar(a,b,(a,b)=>a+b),sub=(a,b)=>scalar(a,b,(a,b)=>a-b),mul=(a,b)=>scalar(a,b,(a,b)=>a*b),div=(a,b)=>scalar(a,b,(a,b)=>a/b);
// Pinned Wine 11 DDRAW RVA 1bc40, D3DTRANSFORM_UNCLIPPED (flags=2).
// Device matrices remain inputs; projected particle outputs are computed.
export function projectWineParticleCenters(input,matrices,viewport){
 if(input.byteLength%32||matrices.length!==3||matrices.some(m=>m.length!==16)||viewport.length!==4||viewport.some(v=>!Number.isInteger(v)||v<0||v>0xffffffff))throw Error('Invalid particle projection inputs');
 const matrix=multiplyWineRenderMatrix(matrices[2],multiplyWineRenderMatrix(matrices[0],matrices[1]));
 const bytes=new Uint8Array(input.byteLength),output=new DataView(bytes.buffer);
 bytes.set(new Uint8Array(input.buffer,input.byteOffset,input.byteLength));
 const [vx,vy,width,height]=viewport;
 for(let i=0;i<input.byteLength;i+=32){
  const x=input.getFloat32(i,true),y=input.getFloat32(i+4,true),z=input.getFloat32(i+8,true);
  const p=Array.from({length:4},(_,c)=>add(add(add(mul(x,matrix[c]),mul(y,matrix[4+c])),mul(z,matrix[8+c])),matrix[12+c]));
  const rhw=div(1,p[3]);
  output.setFloat32(i,mul(add(mul(p[0],rhw),1),f(width))*.5+vx,true);
  output.setFloat32(i+4,mul(sub(1,mul(p[1],rhw)),f(height))*.5+vy,true);
  output.setFloat32(i+8,mul(p[2],rhw),true);output.setFloat32(i+12,rhw,true);
 }
 return bytes;
}
