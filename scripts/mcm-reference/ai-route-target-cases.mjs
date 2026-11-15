import {advanceMcmAiRouteTarget} from '../../src/physics/mcm/ai-route-target.js';
export function generateAiRouteTargetCases(){
 const count=4096,input=Buffer.alloc(count*424),expected=Buffer.alloc(count*28),bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],float=w=>new Float32Array(Uint32Array.of(w).buffer)[0];let seed=0xa52841b,skipped=0,advanced=0,multiple=0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 for(let c=0;c<count;){
  const words=new Uint32Array(106),nodes=new Map(),table=[];words[0]=1+random()%32;words[1]=random()%words[0];words[2]=random()%words[0];words[3]=random()%words[0];
  words[4]=bits((random()%1000-500)/8);words[5]=bits(0);words[6]=bits((random()%1000-500)/8);words[7]=bits((random()%100000-50000)/16000);words[8]=c%2;words[9]=random()%4;
  for(let i=0;i<32;i++){
   const o=10+i*3;words[o]=bits((random()%1000-500)/8);words[o+1]=bits(i===words[0]-1?0:(random()%30));words[o+2]=bits((random()%1000-500)/8);
   if(c%7===0&&i){words[o]=words[10];words[o+2]=words[12];}
   if(i<words[0]){table.push(i+1);nodes.set(i+1,{x:float(words[o]),y:float(words[o+1]),z:float(words[o+2]),next:i+1<words[0]?i+2:0});}
  }
  let r;try{r=advanceMcmAiRouteTarget({head:1,nodes,table,nearest:{index:words[3],address:words[3]+1},index:words[1],reference:words[2],x:float(words[4]),y:float(words[5]),z:float(words[6]),heading:float(words[7]),fieldBB8:words[8],fieldC3C:words[9]});}catch(e){if(!e.message.includes('Nonterminating'))throw e;if(++skipped>4096)throw e;continue;}
  if(r.advances)advanced++;if(r.advances>1)multiple++;
  words.forEach((v,i)=>input.writeUInt32LE(v,c*424+i*4));[r.address,r.next,r.index,r.fieldC3C,bits(r.targetHeading),bits(r.segmentHeading),r.routeDifference].forEach((v,i)=>expected.writeUInt32LE(v,c*28+i*4));c++;
 }
 return {input,expected,skipped,advanced,multiple};
}
