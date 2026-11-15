import {floatBits as bits,bitsFloat as float} from './math.js';
const f=Math.fround;
// Original 0x46f824..0x46f911. Query smooth terrain normals only on the first
// eligible airborne call; retain the resulting pitch until jump entry resets it.
export function computeMcmAiLandingPitch({airborne,flag,angle,verticalBias,vy,vx,vz,x,z,matrix4c0,matrix4c8,queryNormal}){
 const raw=(verticalBias+vy)*f(.03105589933693409);
 if(!airborne||flag||!(raw<.5||Number.isNaN(raw)))return {flag,angle,queried:false};
 const time=f(raw),point=[f(vx*time+x),0,f(vz*time+z)],normal=queryNormal(point);
 angle=f(Math.atan2(normal[1],f(matrix4c0*normal[0]+matrix4c8*normal[2])));
 if((bits(angle)|0)>0x4002b0b4)angle=float(0x4002b0b4);
 return {flag:1,angle,queried:true};
}
