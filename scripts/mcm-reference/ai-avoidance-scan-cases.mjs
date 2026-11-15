import {scanMcmAiAvoidance} from '../../src/physics/mcm/ai-avoidance-scan.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function scanWords(w){
 const record=o=>({active:w[o],heading:float(w[o+2]),halfAngle:float(w[o+4])});
 const actors=(o,count)=>Array.from({length:count},(_,i)=>({self:!!w[o+i*6],record:record(o+i*6+1)}));
 const nodes=new Map(Array.from({length:4},(_,i)=>{const o=63+i*11;return [i+1,{x:float(w[o]),z:float(w[o+2]),kind:w[o+4],next:w[o+10]}];}));
 const r=scanMcmAiAvoidance({heading:float(w[0]),targetHeading:float(w[1]),speedLimit:float(w[2]),lateralError:float(w[3]),threshold:float(w[4]),range:float(w[5]),x:float(w[6]),z:float(w[7]),player:record(8),firstActors:actors(15,w[13]),secondActors:actors(39,w[14]),head:1,nodes});
 return [bits(r.selectedHeading),bits(r.steeringDifference),bits(r.speedLimit),bits(r.offset),r.flag];
}
export function generateAiAvoidanceScanCases(){
const count=4096,input=Buffer.alloc(count*428),expected=Buffer.alloc(count*20);let seed=0x152d843;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
for(let c=0;c<count;c++){
 const w=new Uint32Array(107);w[0]=bits((random()%62800-31400)/10000);w[1]=bits((random()%62800-31400)/10000);w[2]=bits(160);w[3]=bits(c%2?20:0);w[4]=bits(10);w[5]=bits(100);w[8]=c%3?1:0;w[10]=bits((random()%62800-31400)/10000);w[12]=bits((random()%16000)/10000);w[13]=c%5;w[14]=Math.floor(c/5)%5;
 for(let i=0;i<8;i++){const o=i<4?15+i*6:39+(i-4)*6;w[o]=random()%4===0?1:0;w[o+1]=random()%4===0?0:1;w[o+3]=bits((random()%62800-31400)/10000);w[o+5]=bits((random()%16000)/10000);}
 for(let i=0;i<4;i++){const o=63+i*11;w[o]=bits((random()%20000-10000)/100);w[o+2]=bits((random()%20000-10000)/100);w[o+4]=random()%8;w[o+10]=i===3?0:i+2;}
 w.forEach((x,i)=>input.writeUInt32LE(x,c*428+i*4));scanWords(w).forEach((x,i)=>expected.writeUInt32LE(x,c*20+i*4));
}
return {input,expected};
}
