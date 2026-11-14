import {tickMcmParticlePool} from '../../src/physics/mcm/particle-pool-tick.js';
export function compareParticlePoolTick(input,output){
 const inputSize=76024,outputSize=76004;
 if(!input.length||input.length%inputSize||output.length!==input.length/inputSize*outputSize)throw Error('Wrong particle pool oracle sizes');
 let comparedWords=0,changedWords=0;const differences=[];
 for(let i=0;i<input.length/inputSize;i++){
  const source=input.subarray(i*inputSize,(i+1)*inputSize),original=output.subarray(i*outputSize,(i+1)*outputSize);
  const recovered=Buffer.alloc(outputSize);source.copy(recovered,0,8,12);source.copy(recovered,4,24);
  const before=Buffer.from(recovered),order=Array.from({length:1000},(_,j)=>recovered.readUInt32LE(4+j*4));
  const pool={get count(){return recovered.readUInt32LE(0);},set count(v){recovered.writeUInt32LE(v>>>0,0);},acceleration:[12,16,20].map(o=>source.readFloatLE(o)),
   particle:n=>new DataView(recovered.buffer,recovered.byteOffset+4004+order[n]*72,72),swap:(a,b)=>{[order[a],order[b]]=[order[b],order[a]];}};
  tickMcmParticlePool(pool,{dt:source.readFloatLE(0),paused:source.readUInt32LE(4)});
  order.forEach((v,j)=>recovered.writeUInt32LE(v,4+j*4));
  for(let o=0;o<outputSize;o+=4){comparedWords++;if(before.readUInt32LE(o)!==original.readUInt32LE(o))changedWords++;if(original.readUInt32LE(o)!==recovered.readUInt32LE(o))differences.push({case:i,offset:o,original:original.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}
 }
 return {cases:input.length/inputSize,comparedWords,changedWords,differences};
}
