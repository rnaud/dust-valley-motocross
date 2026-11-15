import {writeMcmAiAvoidanceRecord} from '../../src/physics/mcm/ai-avoidance-record.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function generateAiAvoidanceRecordCases(){
 const count=4096*3,input=Buffer.alloc(count*64),expected=Buffer.alloc(count*20);let seed=0x245ab312;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 for(let c=0;c<count;c++){
  const w=new Uint32Array(16);w[0]=c%3;
  for(let i=1;i<=12;i++)w[i]=bits((random()%20000-10000)/32);
  w[13]=bits(c%5===0?0:c%5===1?-100:c%5===2?1000:100);w[14]=0x3eabcdef;w[15]=0xbe123456;
  if(c%7===0)for(let i=0;i<6;i++)w[7+i]=w[1+i];
  if(c%11===0){for(let i=1;i<=12;i++)w[i]=0;w[7]=bits(1);w[13]=bits(1);}
  const body=o=>Object.fromEntries(['x','y','z','vx','vy','vz'].map((k,i)=>[k,float(w[o+i])]));
  const r=writeMcmAiAvoidanceRecord({heading:float(w[14]),halfAngle:float(w[15])},{self:body(1),other:body(7),radius:float(w[13]),player:w[0]===0});
  w.forEach((v,i)=>input.writeUInt32LE(v,c*64+4*i));
  [r.active,bits(r.distance),bits(r.heading),bits(r.relativeSpeedSquaredPlusOne),bits(r.halfAngle)].forEach((v,i)=>expected.writeUInt32LE(v,c*20+4*i));
 }
 return {input,expected};
}
