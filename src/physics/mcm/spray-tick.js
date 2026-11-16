import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround;
// Original 4393d0. The index-32 vector reads the index word and the following
// two captured words; it does not wrap early at the nominal table boundary.
export function tickMcmSpray(emitter,{dt,paused,pool}){
 const u=o=>emitter.getUint32(o,true),v=o=>emitter.getFloat32(o,true);
 const put=(o,n)=>emitter.setUint32(o,n>>>0,true),set=(o,n)=>emitter.setFloat32(o,n,true);
 if(paused)return 1;
 if(u(0x30)){for(let j=0;j<12;j+=4)put(0x54+j,u(0x48+j));put(0x30,0);return 1;}
 if(!u(0x64)){put(0x68,0);put(0x6c,0);return 1;}
 if(!pool)throw Error('Active spray requires the captured shared particle pool');
 const elapsed=add(v(0x68),dt),rawAmount=mul(v(0x44),elapsed),amount=f(rawAmount),inverse=div(1,amount);
 set(0x68,sub(elapsed,div(rawAmount,v(0x44))));
 const step=[0,4,8].map(o=>f(mul(f(sub(v(0x48+o),v(0x54+o))),inverse)));
 const velocity=[0,4,8].map(o=>f(mul(mul(v(0x78+o),elapsed),inverse)));
 const acceleration=pool.acceleration.map(a=>f(mul(mul(a,elapsed),inverse)));
 if((floatBits(amount)|0)>0)for(let i=0;i<amount||Number.isNaN(amount);i++){
  if(pool.count===1000)return 1;
  const p=pool.particle(pool.count),remaining=sub(amount,i);p.setUint32(0x14,0,true);
  for(let j=0;j<3;j++)p.setFloat32(j*4,add(add(mul(step[j],i),v(0x54+j*4)),mul(velocity[j],remaining)),true);
  for(const [to,from]of [[0x10,0x70],[0x1c,0x84+u(0x484)*4],[0x18,0x38]])p.setUint32(to,u(from),true);
  const index=u(0x608);if(index===32&&emitter.byteLength<0x614)throw Error('Spray table boundary bytes are not captured');
  for(let j=0;j<3;j++){
   p.setFloat32(0x38+j*4,add(mul(acceleration[j],remaining),v(0x78+j*4)),true);
   p.setFloat32(0x38+j*4,mul(v(0x488+index*12+j*4),p.getFloat32(0x38+j*4,true)),true);
  }
  p.setUint32(0x34,u(0x74),true);p.setFloat32(0x20,mul(v(0x84+u(0x484)*4),2),true);pool.count++;
  for(const [offset,limit,reset]of [[0x70,44,29],[0x608,32,0],[0x484,256,0]]){const next=(u(offset)+1)|0;put(offset,next>limit?reset:next);}
 }
 put(0x60,u(0x40));return 1;
}
