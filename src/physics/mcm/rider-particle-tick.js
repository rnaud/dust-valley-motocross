import {floatBits} from './math.js';
const f=Math.fround;
// Original rider child callback 0x43a0c0, including particle creation.
export function tickMcmRiderParticles(view,{dt,paused,pool}){
 if(paused)return 1;
 if(view.getUint32(0x30,true)){
  for(let i=0;i<12;i+=4)view.setUint32(0x54+i,view.getUint32(0x48+i,true),true);
  view.setUint32(0x30,0,true);return 1;
 }
 if(!view.getUint32(0x64,true)){
  view.setFloat32(0x68,view.getFloat32(0x68,true)+dt,true);return 1;
 }
 if(!pool)throw Error('Active rider particles require the captured particle pool');
 const u=o=>view.getUint32(o,true),v=o=>view.getFloat32(o,true),put=(o,n)=>view.setUint32(o,n>>>0,true),set=(o,n)=>view.setFloat32(o,n,true);
 if((u(0x68)|0)>0x3f400000){put(0x6c,0);put(0x70,0);for(let i=0;i<12;i+=4)put(0x54+i,u(0x48+i));}
 const elapsed=v(0x6c)+dt,rawAmount=v(0x44)*elapsed,amount=f(rawAmount),inverse=1/amount;
 set(0x6c,elapsed-rawAmount/v(0x44));
 const delta=[0,4,8].map(o=>f(f(v(0x48+o)-v(0x54+o))*inverse));
 const velocity=[0,4,8].map(o=>f(v(0x7c+o)*elapsed*inverse));
 if((floatBits(amount)|0)>0)for(let i=0;i<amount;i++){
  if(pool.count===1000)return 1;
  const p=pool.particle(pool.count),remaining=amount-i;
  p.setUint32(0x14,0x44bb8000,true);
  for(let j=0;j<3;j++)p.setFloat32(j*4,(delta[j]*i+v(0x54+j*4))+velocity[j]*remaining,true);
  for(const [to,from]of [[0x10,0x74],[0x18,0x38],[0x34,0x78]])p.setUint32(to,u(from),true);
  p.setFloat32(0x1c,1,true);p.setFloat32(0x20,2,true);
  // Native index 32 reads its own index word and two following words. Require
  // those trailing captured bytes instead of inventing a wrapped table entry.
  const index=u(0x60c);if(index===32&&view.byteLength<0x618)throw Error('Rider particle table boundary bytes are not captured');
  for(let j=0;j<3;j++)p.setUint32(0x38+j*4,u(0x48c+index*12+j*4),true);
  pool.count++;
  for(const [offset,limit]of [[0x74,12],[0x60c,32],[0x488,256]]){const next=(u(offset)+1)|0;put(offset,next>limit?0:next);}
 }
 for(let i=0;i<12;i+=4)put(0x54+i,u(0x48+i));put(0x60,u(0x40));put(0x64,0);put(0x68,0);return 1;
}
