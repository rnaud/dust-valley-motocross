import {computeMcmAiRouteGuidance} from '../../src/physics/mcm/ai-route-guidance.js';
import {mcmInverseSqrtSeed} from '../../src/physics/mcm/inverse-sqrt.js';
export function generateAiRouteGuidanceCases(mode=0){
 const size=mode?252:240,count=4096,input=Buffer.alloc(count*size),expected=Buffer.alloc(count*24),bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],float=w=>new Float32Array(Uint32Array.of(w).buffer)[0];let seed=0x6412eac;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 for(let c=0;c<count;c++){
  const words=new Uint32Array(mode?63:60);words[0]=bits((random()%10000-5000)/32);words[1]=bits((random()%10000-5000)/32);words[2]=bits((random()%100000-50000)/16000);words[3]=bits(c%4===0?0:c%4===1?-10:c%4===2?300:100);
  const nodes=[];for(let i=0;i<5;i++){const o=5+i*11;words[o]=bits((random()%10000-5000)/32);words[o+2]=bits((random()%10000-5000)/32);words[o+4]=random()%10;words[o+6]=bits((random()%1000-500)/8);words[o+7]=bits((random()%1000-500)/8);if(c%7===0&&i>=3){words[o]=words[27];words[o+2]=words[29];}if(mode)words[o+5]=bits((random()%20000-1000)/100);nodes.push({speedLimit:float(words[o+5]),x:float(words[o]),z:float(words[o+2]),kind:words[o+4],offsetX:float(words[o+6]),offsetZ:float(words[o+7])});}
  const dx=nodes[4].x-nodes[2].x,dz=nodes[4].z-nodes[2].z;words[4]=bits(mcmInverseSqrtSeed(Math.fround(dz*dz+dx*dx)));
  if(mode){words[60]=bits((random()%20000-10000)/10000);words[61]=bits((random()%20000-10000)/10000);words[62]=c%8;}
  words.forEach((v,i)=>input.writeUInt32LE(v,c*size+i*4));const r=computeMcmAiRouteGuidance({mode,direction:mode?{x:float(words[60]),z:float(words[61])}:undefined,target:nodes[0],targetNext:nodes[1],nearest:nodes[2],previous:nodes[3],next:nodes[4],x:float(words[0]),z:float(words[1]),heading:float(words[2]),lookahead:float(words[3]),inverseLength:float(words[4])});Object.values(r).forEach((v,i)=>expected.writeUInt32LE(bits(v),c*24+i*4));
 }
 return {input,expected};
}
