import {applyMcmAiRouteData} from '../../src/physics/mcm/ai-route-data.js';
export function generateAiRouteDataCases(){
 let seed=0x46bdc0;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;},inputs=[],outputs=[],count=4096;
 for(let c=0;c<count;c++){
  const counts=[random()%4,random()%4,random()%4],limit=c%13===0?65535:c%4,initial=Array.from({length:36},random),words=[c%17===0?11:c%19===0?0xffffffff:3];
  for(let a=0;a<3;a++){words.push(c%11===0&&a===1?11:random()%11,c%7===0&&a===1?counts[a]+1:counts[a]);for(let n=0;n<counts[a];n++)for(let k=0;k<4;k++)words.push(random());}
  const file=Buffer.alloc(words.length*4);words.forEach((v,i)=>file.writeUInt32LE(v,i*4));const bytes=c%23===0?null:c%3===0?file.subarray(0,random()%(file.length+1)):file;
  const header=Buffer.alloc(164);[limit,...counts,bytes===null?0xffffffff:bytes.length,...initial].forEach((v,i)=>header.writeUInt32LE(v,i*4));inputs.push(header);if(bytes)inputs.push(bytes);
  const actors=counts.map((routeCount,a)=>({routeCount,nodes:Array.from({length:3},(_,n)=>{const w=new Uint32Array(11);[5,6,7,9].forEach((o,k)=>w[o]=initial[(a*3+n)*4+k]);return w;})})),r=applyMcmAiRouteData(bytes,actors,limit),result=[Number(r.loaded),r.bytesRead,Number(r.closed),...actors.flatMap(a=>a.nodes.flatMap(n=>[5,6,7,9].map(o=>n[o])))],out=Buffer.alloc(156);result.forEach((v,i)=>out.writeUInt32LE(v,i*4));outputs.push(out);
 }
 return {input:Buffer.concat(inputs),expected:Buffer.concat(outputs)};
}
