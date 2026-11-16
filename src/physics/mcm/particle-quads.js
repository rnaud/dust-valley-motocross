import {floatBits} from './math.js';
import {sortMcmParticlesByDepth} from './particle-sort.js';
const nearestEven=x=>{if(!Number.isFinite(x)||x>2147483647||x< -2147483648)return -2147483648;const lo=Math.floor(x),p=x-lo;return p<.5?lo:p>.5?lo+1:lo%2===0?lo:lo+1;};
// Original 43b599..43b835. Projection, UV table and inherited diffuse seed are
// explicit stage inputs. Preserve color carry for particles with flag bit 0.
export function buildMcmParticleQuads(particles,projected,{flags,near,far,viewDepth,uv,seed},output){
 const order=sortMcmParticlesByDepth(particles.map((_,i)=>i),i=>projected[i].getFloat32(8,true));
 const fogEnabled=!!(flags&0x80)&&!(flags&0x100),inverse=Math.fround(1/(far-near));let color=seed>>>0,fog=0;
 for(let slot=0;slot<order.length;slot++){
  const i=order[slot],p=particles[i],q=projected[i],f=o=>p.getFloat32(o,true),u=o=>p.getUint32(o,true);
  if(fogEnabled){
   const z=(f(8)*viewDepth[2]+f(0)*viewDepth[0])+f(4)*viewDepth[1];
   const raw=1-((z+viewDepth[3])-near)*inverse;let value=Math.fround(raw);
   if(!(raw>=0))value=0;else if((floatBits(value)|0)>0x3f800000)value=1;
   fog=(nearestEven(Math.fround(value*255))<<24)>>>0;
  }
  if(!(u(0x34)&1)){
   const alpha=u(0x34)&2?nearestEven(Math.fround((1-f(0x14)/f(0x18))*255-.5)):255;
   color=(u(0xc)|(alpha<<24))>>>0;
  }
  const corners=[[0x2c,0x24],[0x30,0x24],[0x30,0x28],[0x2c,0x28]],sprite=u(0x10);
  for(let j=0;j<4;j++){
   const o=slot*128+j*32;
   const words=[u(corners[j][0]),u(corners[j][1]),q.getUint32(8,true),q.getUint32(12,true),color,fog,uv.getUint32(sprite*32+j*8,true),uv.getUint32(sprite*32+j*8+4,true)];
   words.forEach((v,k)=>output.setUint32(o+k*4,v,true));
  }
 }
 return order;
}

// Original 43b835..43b8f6. Vertex count deliberately uses total pool count,
// while the index count uses visible count. Preserve the original call order.
export function submitMcmParticleQuads({texture,format,totalCount,visibleCount,vertices,indices},device){
 device.bindTexture(texture);device.setState(27,1,0);
 if(format!==0x115c)device.setState(33,1,0);
 device.setState(21,4,0);
 device.draw(4,3,vertices,totalCount*4,indices,visibleCount*6,0);
 if(format!==0x115c)device.setState(33,0,0);
 device.setState(27,0,0);device.setState(21,2,0);return 1;
}
