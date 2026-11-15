import {composeMcmViewMatrix} from './view-matrix.js';
import {mcmSinCos} from './x87-trig.js';
import {mcmAdd as add,mcmMultiply as mul,mcmDivide as div,mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;
// Original by-value matrix product 0x475b00: unlike 0x4b9bb0, sum in loop order.
function product(a,b){
 const result=new Float32Array(16);
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  let sum=0;for(let k=0;k<4;k++)sum=add(sum,mul(a[row*4+k],b[k*4+col]));result[row*4+col]=f(sum);
 }
 return result;
}
// Original 0x47a670..0x47a819. Preserve the stored radians constant and the
// separate float-rounded projection angle versus unrounded screen-scale angle.
export function composeMcmCameraMatrices(camera){
 const angle=f(camera.fov),near=f(camera.near),far=f(camera.far),aspect=f(camera.aspect);
 const half=f(angle*.01745329)*.5,trig=mcmSinCos(half),scale=f(div(f(trig.cos),trig.sin)),depth=f(div(1,sub(1,div(near,far))));
 const projection=Float32Array.from([scale,0,0,0,0,scale,0,0,0,0,depth,1,0,0,f(-mul(depth,near)),0]);
 const view=composeMcmViewMatrix(camera.values);
 const viewport=Float32Array.from([.5,0,0,0,0,f(-.5*aspect),0,0,0,0,1,0,.5,.5,0,1]);
 const screen=product(projection,viewport),combined=product(view,screen);
 const screenScale=f(div((camera.width>>>0)*.5,Math.tan(angle*.5*.01745329)));
 return {projection,view,combined,screen,screenScale};
}
