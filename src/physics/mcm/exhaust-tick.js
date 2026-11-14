import {floatBits,mcmSqrtLookup} from './math.js';
import {mcmDivide as div,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x43a6d0. Views retain every untouched allocation byte. Particle
// insertion is the original 0x43b160 store sequence, including pool exhaustion.
export function tickMcmExhaust(emitter,{dt,paused,pool}){
 const u=o=>emitter.getUint32(o,true),v=o=>emitter.getFloat32(o,true);
 const put=(o,x)=>emitter.setUint32(o,x>>>0,true),set=(o,x)=>emitter.setFloat32(o,x,true);
 if(paused||!u(0x64)||!u(0x70))return 1;
 if((u(0x48)|0)<=0){put(0x48,0);put(0x70,0);put(0x74,0);return 1;}
 if(u(0x30)){for(let i=0;i<12;i+=4)put(0x58+i,u(0x4c+i));put(0x30,0);return 1;}
 set(0x48,sub(v(0x48),dt));
 const delta=[0,4,8].map(o=>f(sub(v(0x4c+o),v(0x58+o))));
 const [x,y,z]=delta,length=mcmSqrtLookup(f((y*y+z*z)+x*x));
 const count=div(length,v(0x40)*f(.3)),step=delta.map(d=>f(mul(d,div(1,count))));
 const amount=u(0x74)?5:f(count),growth=f(div(sub(dt*3,v(0x40)),amount));
 if((floatBits(amount)|0)<=0)return 1;
 for(let i=0;i<amount;i++){
  if(!u(0x34))return 1;
  if(!pool)throw Error('Exhaust particle pool is not captured');
  if(pool.count===1000)return 1;
  const p=pool.particle(pool.count),position=[0,4,8].map((o,j)=>f(sub(v(0x4c+o),mul(step[j],i))));
  p.setUint32(0x14,0,true);
  position.forEach((n,j)=>p.setFloat32(j*4,n,true));
  p.setUint32(0x10,u(0x68),true);p.setFloat32(0x1c,i*growth+v(0x40),true);
  for(const [to,from] of [[0x18,0x38],[0x20,0x78+u(0x478)*4],[0x34,0x6c],[0xc,0x47c]])p.setUint32(to,u(from),true);
  pool.count++;
  const index=(u(0x478)+1)|0,frame=(u(0x68)+1)|0;
  put(0x478,index>=256?0:index);put(0x68,frame>=18?14:frame);
 }
 return 1;
}
