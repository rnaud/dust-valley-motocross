import {floatBits,mcmSqrtLookup} from './math.js';
import {mcmAdd as add,mcmDivide as div,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;

// Original 438e10, including the complete 43b160 insertion stores. Invocation
// timing belongs to the world scheduler; frame-effects only prepares inputs.
export function tickMcmDust(emitter,{dt,paused,pool}){
 const u=o=>emitter.getUint32(o,true),v=o=>emitter.getFloat32(o,true);
 const put=(o,n)=>emitter.setUint32(o,n>>>0,true),set=(o,n)=>emitter.setFloat32(o,n,true);
 const copyPosition=()=>{for(let j=0;j<12;j+=4)put(0x54+j,u(0x48+j));};
 if(paused)return 1;
 if(!u(0x64)){put(0x6c,0);put(0x70,0);copyPosition();put(0x68,0);return 1;}
 if(!u(0x68)){put(0x68,1);return 1;}
 if(u(0x30)){copyPosition();put(0x30,0);return 1;}
 const delta=[0,4,8].map(o=>f(sub(v(0x48+o),v(0x54+o))));
 const [x,y,z]=delta,length=mcmSqrtLookup(f(add(add(mul(y,y),mul(z,z)),mul(x,x)))),storedLength=f(length),rate=div(length,dt);
 set(0x40,(u(0x7c)&0x7fffffff)?mul(mul(v(0x7c),f(.013333)),f(rate)):mul(rate,f(.013333)));
 if((u(0x40)|0)<0x3dcccccd)put(0x40,0x3dcccccd);
 if((u(0x40)|0)>0x40000000)put(0x40,0x40000000);
 set(0x38,mul(v(0x40),2000));
 if((u(0x38)|0)<0x43fa0000)put(0x38,0x43fa0000);
 else if((u(0x38)|0)>0x447a0000)put(0x38,0x447a0000);
 const spacing=mul(add(v(0x60),v(0x40)),f(.3)),rawAmount=div(storedLength,spacing),amount=f(rawAmount);
 const growth=f(div(sub(v(0x40),v(0x60)),amount));
 set(0x70,sub(storedLength,mul(rawAmount,spacing)));
 const inverse=div(1,amount),step=delta.map(d=>f(mul(d,inverse))),age=f(mul(v(0x38),.25));
 // Native fcom treats unordered as carry-set, continuing until pool exhaustion.
 if((floatBits(amount)|0)>0)for(let i=0;i<amount||Number.isNaN(amount);i++){
  if(!u(0x34))return 1;
  if(!pool)throw Error('Active dust requires the captured shared particle pool');
  if(pool.count===1000)return 1;
  const p=pool.particle(pool.count),size=add(mul(i,growth),v(0x40));
  p.setFloat32(0x14,age,true);
  step.forEach((d,j)=>p.setFloat32(j*4,add(mul(d,i),v(0x54+j*4)),true));
  for(const [to,from]of [[0x10,0x74],[0x18,0x38],[0x34,0x78],[0xc,0x80]])p.setUint32(to,u(from),true);
  p.setFloat32(0x1c,size,true);p.setFloat32(0x20,mul(2,size),true);pool.count++;
  const index=(u(0x74)+1)|0;put(0x74,index>=13?0:index);
 }
 put(0x60,u(0x40));return 1;
}
