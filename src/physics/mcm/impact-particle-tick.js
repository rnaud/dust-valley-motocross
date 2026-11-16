import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround;
// Original impact emitter 439a30. It resets position history before emission
// and replaces computed velocity with raw table words, including index 32.
export function tickMcmImpactParticles(emitter,{dt,paused,pool}){
 const u=o=>emitter.getUint32(o,true),v=o=>emitter.getFloat32(o,true);
 const put=(o,n)=>emitter.setUint32(o,n>>>0,true),set=(o,n)=>emitter.setFloat32(o,n,true);
 if(paused)return 1;
 if(u(0x30)){for(let j=0;j<12;j+=4)put(0x54+j,u(0x48+j));put(0x30,0);return 1;}
 if(!u(0x64)){set(0x68,add(v(0x68),dt));put(0x6c,0);put(0x70,0);return 1;}
 if(!pool)throw Error('Active impact emitter requires the shared particle pool');
 for(let j=0;j<12;j+=4)put(0x54+j,u(0x48+j));
 const elapsed=add(v(0x6c),dt),rawAmount=mul(v(0x44),elapsed),amount=f(rawAmount),inverse=div(1,amount);
 set(0x6c,sub(elapsed,div(rawAmount,v(0x44))));
 const step=[0,4,8].map(o=>f(mul(f(sub(v(0x48+o),v(0x54+o))),inverse)));
 const velocity=[0,4,8].map(o=>f(mul(mul(v(0x7c+o),elapsed),inverse)));
 const acceleration=pool.acceleration.map(a=>f(mul(mul(a,elapsed),inverse)));
 if((floatBits(amount)|0)>0)for(let i=0;i<amount||Number.isNaN(amount);i++){
  if(pool.count===1000)break;
  const p=pool.particle(pool.count),remaining=sub(amount,i);p.setUint32(0x14,0,true);
  for(let j=0;j<3;j++)p.setFloat32(j*4,add(add(mul(step[j],i),v(0x54+j*4)),mul(velocity[j],remaining)),true);
  for(const [to,from]of [[0x10,0x74],[0x1c,0x88+u(0x488)*4],[0x18,0x38]])p.setUint32(to,u(from),true);
  const index=u(0x60c);if(index===32&&emitter.byteLength<0x618)throw Error('Impact emitter table boundary bytes are not captured');
  for(let j=0;j<3;j++){
   p.setFloat32(0x38+j*4,add(mul(acceleration[j],remaining),v(0x7c+j*4)),true);
   p.setUint32(0x38+j*4,u(0x48c+index*12+j*4),true);
  }
  p.setUint32(0x34,u(0x78),true);p.setFloat32(0x20,mul(v(0x88+u(0x488)*4),2),true);pool.count++;
  for(const [offset,limit,reset]of [[0x74,60,45],[0x60c,32,0],[0x488,256,0]]){const next=(u(offset)+1)|0;put(offset,next>limit?reset:next);}
 }
 put(0x60,u(0x40));put(0x64,0);put(0x68,0);return 1;
}
