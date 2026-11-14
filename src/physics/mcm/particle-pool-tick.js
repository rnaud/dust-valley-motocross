const f=Math.fround;

// Original shared pool update 0x43b200. Slots are pointers into allocations:
// expiry swaps slots, and the incoming last particle is skipped this tick.
// The caller supplies the actual pool delta and pause state, not rider timing.
export function tickMcmParticlePool(pool,{dt,paused}){
 if(paused)return 1;
 const ageStep=f(dt*1000);
 for(let i=0;i<(pool.count|0);i++){
  const p=pool.particle(i),get=o=>p.getFloat32(o,true),set=(o,v)=>p.setFloat32(o,v,true);
  set(0x14,get(0x14)+ageStep);
  // x87 unordered comparisons follow the surviving-particle branch.
  if(get(0x14)>get(0x18)){pool.swap(i,pool.count-1);pool.count--;continue;}
  const flags=p.getUint32(0x34,true);
  if(flags&8)set(0x1c,get(0x20)*dt+get(0x1c));
  if(flags&4){
   // Native Y/Z products spill to float32; X stays in the x87 register.
   const y=f(get(0x3c)*dt),z=f(get(0x40)*dt);
   set(0,get(0x38)*dt+get(0));set(4,get(4)+y);set(8,get(8)+z);
  }
  if(flags&16){
   const a=pool.acceleration,y=f(a[1]*dt),z=f(a[2]*dt);
   set(0x38,a[0]*dt+get(0x38));set(0x3c,get(0x3c)+y);set(0x40,get(0x40)+z);
  }
 }
 return 1;
}
