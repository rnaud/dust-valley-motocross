import {tickMcmRiderParticles} from '../../src/physics/mcm/rider-particle-tick.js';
export function compareRiderParticleTick(input,output){
 const inputSize=0x624,outputSize=0x61c+1000*0x44;
 if(input.length%inputSize||output.length!==input.length/inputSize*outputSize)throw Error('Wrong rider particle oracle sizes');
 let comparedWords=0,changedWords=0;const differences=[];
 for(let i=0;i<input.length/inputSize;i++){
  const source=input.subarray(i*inputSize,(i+1)*inputSize),original=output.subarray(i*outputSize,(i+1)*outputSize);
  const recovered=Buffer.alloc(outputSize,0xa5);source.copy(recovered,0,0,0x618);recovered.writeUInt32LE(source.readUInt32LE(0x620),0x618);
  const before=Buffer.from(recovered),view=(o,n)=>new DataView(recovered.buffer,recovered.byteOffset+o,n);
  const pool={get count(){return recovered.readUInt32LE(0x618);},set count(v){recovered.writeUInt32LE(v,0x618);},particle:n=>view(0x61c+n*0x44,0x44)};
  tickMcmRiderParticles(view(0,0x618),{dt:source.readFloatLE(0x618),paused:source.readUInt32LE(0x61c),pool});
  for(let o=0;o<outputSize;o+=4){comparedWords++;if(before.readUInt32LE(o)!==original.readUInt32LE(o))changedWords++;if(original.readUInt32LE(o)!==recovered.readUInt32LE(o))differences.push({case:i,offset:o,original:original.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}
 }
 return {cases:input.length/inputSize,comparedWords,changedWords,differences};
}
