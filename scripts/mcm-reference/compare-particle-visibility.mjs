import {updateMcmParticleVisibility} from '../../src/physics/mcm/particle-visibility.js';
export function compareParticleVisibility(input,output){
 if(input.length%0x74||output.length!==input.length/0x74*0x4c)throw Error('Wrong visibility oracle sizes');
 let changedWords=0;const differences=[];
 for(let i=0;i<input.length/0x74;i++){
  const source=input.subarray(i*0x74,(i+1)*0x74),actual=Buffer.alloc(0x4c),expected=output.subarray(i*0x4c,(i+1)*0x4c);source.copy(actual,0,0,0x48);
  const view=b=>new DataView(b.buffer,b.byteOffset,b.length);
  actual.writeUInt32LE(+updateMcmParticleVisibility(view(actual.subarray(0,0x48)),view(source.subarray(0x48,0x68)),{scale:source.readFloatLE(0x68),width:source.readInt32LE(0x6c),height:source.readInt32LE(0x70)}),0x48);
  for(let o=0;o<0x4c;o+=4){if(o<0x48&&source.readUInt32LE(o)!==expected.readUInt32LE(o))changedWords++;if(actual.readUInt32LE(o)!==expected.readUInt32LE(o))differences.push({case:i,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});}
 }
 return {cases:input.length/0x74,comparedWords:output.length/4,changedWords,differences};
}
