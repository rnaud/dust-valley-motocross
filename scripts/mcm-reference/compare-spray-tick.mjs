import {tickMcmSpray} from '../../src/physics/mcm/spray-tick.js';
export function compareSprayTick(input,output){
 const inputSize=0x62c,outputSize=0x618+1000*0x48;
 if(input.length%inputSize||output.length!==input.length/inputSize*outputSize)throw Error('Wrong spray oracle sizes');
 let comparedWords=0,changedWords=0;const differences=[];
 for(let i=0;i<input.length/inputSize;i++){
  const source=input.subarray(i*inputSize,(i+1)*inputSize),original=output.subarray(i*outputSize,(i+1)*outputSize);
  const recovered=Buffer.alloc(outputSize,0xa5);source.copy(recovered,0,0,0x614);recovered.writeUInt32LE(source.readUInt32LE(0x61c),0x614);
  const before=Buffer.from(recovered),view=(o,n)=>new DataView(recovered.buffer,recovered.byteOffset+o,n);
  const pool={acceleration:[0,4,8].map(o=>source.readFloatLE(0x620+o)),get count(){return recovered.readUInt32LE(0x614);},set count(v){recovered.writeUInt32LE(v,0x614);},particle:n=>view(0x618+n*0x48,0x48)};
  tickMcmSpray(view(0,0x614),{dt:source.readFloatLE(0x614),paused:source.readUInt32LE(0x618),pool});
  for(let o=0;o<outputSize;o+=4){comparedWords++;if(before.readUInt32LE(o)!==original.readUInt32LE(o))changedWords++;if(original.readUInt32LE(o)!==recovered.readUInt32LE(o))differences.push({case:i,offset:o,original:original.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}
 }
 return {cases:input.length/inputSize,comparedWords,changedWords,differences};
}
