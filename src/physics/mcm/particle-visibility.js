import {mcmMultiply as mul,mcmSubtract as sub,mcmAdd as add} from './x87-arithmetic.js';
// Original 43b4c8..43b575, after the device transforms the particle center.
// Preserve partial stores on rejection: these bounds persist into later ticks.
export function updateMcmParticleVisibility(particle,projected,{scale,width,height}){
 const z=projected.getUint32(8,true);
 if((z|0)>0x3f800000||z>0x80000000)return false;
 const x=projected.getFloat32(0,true),y=projected.getFloat32(4,true);
 const radius=mul(mul(scale,particle.getFloat32(0x1c,true)),projected.getFloat32(12,true)),roundedRadius=Math.fround(radius);
 particle.setFloat32(0x2c,sub(x,radius),true);
 if(!(width>=particle.getFloat32(0x2c,true)))return false;
 const right=add(x,roundedRadius);particle.setFloat32(0x30,right,true);
 if(!(right>=0))return false;
 particle.setFloat32(0x24,sub(y,roundedRadius),true);
 if(!(height>=particle.getFloat32(0x24,true)))return false;
 const bottom=add(y,roundedRadius);particle.setFloat32(0x28,bottom,true);
 return bottom>=0;
}
