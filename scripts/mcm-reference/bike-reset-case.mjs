import {resetMcmBikeState} from '../../src/physics/mcm/bike-reset.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateBikeReset(input,apply=resetMcmBikeState){
 const words=[...input.words],read=i=>bitsFloat(words[i]),vec=i=>[read(i),read(i+1),read(i+2)],write=(i,v)=>{words[i]=floatBits(v);};
 const b={};for(let i=0;i<818;i++)b[`field${(i*4).toString(16)}`]=read(i);
 for(const offset of [0x814,0xc68,0x6fc])b[`field${offset.toString(16)}`]=words[offset/4];b.mass=read(0x558/4);b.inverseMass=read(0x55c/4);
 const vectors={velocity:0x510,acceleration:0x51c,worldAngularVelocity:0x528,angularVelocity:0x534,axis624:0x624,localLever:0x654};
 for(const [key,offset] of Object.entries(vectors))b[key]=vec(offset/4);
 const c={bike:b,randomValue:input.randomValue};
 if(input.loopRider)c.loopRider={...structuredClone(input.loopRider),bikeAnimation:[4,0x10,0x14,0x30,0x2c].map(offset=>words[offset/4]),riderAnimation:[0,0,0,0,0],queries:[],trickIndex:-1};
 if(input.mask&1)c.front={limited:read(818+0x4c/4)};
 if(input.mask&2)c.rear={limited:read(842+0x4c/4)};
 if(input.mask&4)c.component8e4={limit:read(866+0x48/4),field58:read(866+0x58/4),value:vec(866+0x4c/4),field5c:read(866+0x5c/4)};
 if(input.mask&8)c.component8e8={limit:read(890+0x54/4),limitAngle:read(890+0x48/4),divisor:read(890+0x4c/4),field58:read(890+0x58/4),field5c:read(890+0x5c/4)};
 const engineFields={gear:0x158,rpmDemand:0x15c,brake:0x7c,state:0x160,previousRpmDemand:0x164,shiftTimer:0x168,released:0x150,shiftThreshold:0x154};
 if(input.mask&16){c.engine={thresholdBases:[read(914+0x20/4)],thresholdRanges:[read(914+0x50/4)]};for(const [key,offset] of Object.entries(engineFields))c.engine[key]=read(914+offset/4);}
 if(input.mask&32)c.effect=Array.from({length:4},(_,j)=>read(1038+j));
 const result=apply(c);
 for(let i=0;i<818;i++)write(i,b[`field${(i*4).toString(16)}`]);
 for(const offset of [0x620,0x724,0x72c,0x814,0xc68,0x6fc])words[offset/4]=b[`field${offset.toString(16)}`]>>>0;
 write(0x558/4,b.mass);write(0x55c/4,b.inverseMass);
 for(const [key,offset] of Object.entries(vectors))b[key].forEach((v,j)=>write(offset/4+j,v));
 if(c.front)write(818+0x4c/4,c.front.limited);if(c.rear)write(842+0x4c/4,c.rear.limited);
 if(c.component8e4){c.component8e4.value.forEach((v,j)=>write(866+0x4c/4+j,v));write(866+0x5c/4,c.component8e4.field5c);write(866+0x58/4,c.component8e4.field58);}
 if(c.component8e8){write(890+0x58/4,c.component8e8.field58);write(890+0x5c/4,c.component8e8.field5c);}
 if(c.engine)for(const [key,offset] of Object.entries(engineFields)){const i=914+offset/4;if(key==='gear'||key==='released')words[i]=c.engine[key]>>>0;else write(i,c.engine[key]);}
 if(c.effect)c.effect.forEach((v,j)=>write(1038+j,v));
 return [...words,result.randomCalls];
}
