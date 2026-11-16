import {tickMcmDust} from '../../src/physics/mcm/dust-tick.js';
export function compareDustTick(input,output){
 const inputSize=0x90,outputSize=0x88+1000*0x48;
 if(input.length%inputSize||output.length!==input.length/inputSize*outputSize)throw Error('Wrong dust oracle sizes');
 let comparedWords=0,changedWords=0;const differences=[];
 for(let i=0;i<input.length/inputSize;i++){
  const source=input.subarray(i*inputSize,(i+1)*inputSize),original=output.subarray(i*outputSize,(i+1)*outputSize);
  const recovered=Buffer.alloc(outputSize,0xa5);source.copy(recovered,0,0,0x84);recovered.writeUInt32LE(source.readUInt32LE(0x8c),0x84);
  const before=Buffer.from(recovered),view=(o,n)=>new DataView(recovered.buffer,recovered.byteOffset+o,n);
  const pool={get count(){return recovered.readUInt32LE(0x84);},set count(v){recovered.writeUInt32LE(v,0x84);},particle:n=>view(0x88+n*0x48,0x48)};
  tickMcmDust(view(0,0x84),{dt:source.readFloatLE(0x84),paused:source.readUInt32LE(0x88),pool});
  for(let o=0;o<outputSize;o+=4){comparedWords++;if(before.readUInt32LE(o)!==original.readUInt32LE(o))changedWords++;if(original.readUInt32LE(o)!==recovered.readUInt32LE(o))differences.push({case:i,offset:o,original:original.readUInt32LE(o),recovered:recovered.readUInt32LE(o)});}
 }
 return {cases:input.length/inputSize,comparedWords,changedWords,differences};
}
