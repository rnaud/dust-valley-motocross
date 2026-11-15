import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
export function generateAiRouteSegmentCases(){
 const count=4096,input=Buffer.alloc(count*524),expected=Buffer.alloc(count*32),bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],float=w=>new Float32Array(Uint32Array.of(w).buffer)[0];let seed=0x73ae51d;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 const special=[0,0x80000000,1,0x7f7fffff,0x7f800000,0xff800000,0x7fc00000];
 for(let c=0;c<count;c++){
  const words=new Uint32Array(131),nodes=new Map(),table=[];words[0]=1+c%32;words[1]=bits((random()%100000-50000)/16);words[2]=bits((random()%100000-50000)/16);
  for(let i=0;i<32;i++){
   const offset=3+i*4;words[offset]=bits((random()%100000-50000)/16);words[offset+1]=bits((random()%100000-50000)/16);words[offset+2]=bits((random()%10000-5000)/8);words[offset+3]=random()%10;
   if(c%5===0){words[offset]=special[random()%special.length];words[offset+1]=special[random()%special.length];}
   if(c%7===0&&i){words[offset]=words[3];words[offset+1]=words[4];}
   if(i<words[0]){table.push(i+1);nodes.set(i+1,{x:float(words[offset]),z:float(words[offset+1]),speed:float(words[offset+2]),kind:words[offset+3],next:i+1<words[0]?i+2:0});}
  }
  words.forEach((v,i)=>input.writeUInt32LE(v,c*524+i*4));
  const r=selectMcmAiRouteSegment({head:1,nodes,table,x:float(words[1]),z:float(words[2])});
  [r.address,r.index,r.next,r.previous,bits(r.inverseLength),bits(r.speed),+r.class27,+r.class3456].forEach((v,i)=>expected.writeUInt32LE(v,c*32+i*4));
 }
 return {input,expected};
}
