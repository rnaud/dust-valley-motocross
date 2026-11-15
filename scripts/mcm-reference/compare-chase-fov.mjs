import {stepMcmChaseFov,beginMcmCameraUpdate} from '../../src/physics/mcm/chase-fov.js';
export function compareChaseFov(input,output){
 if(!input.length||input.length%44||output.length!==input.length/44*32)throw Error('Incomplete FOV oracle data');let differences=0;const examples=[];
 for(let i=0;i<input.length/44;i++){
  const a=input.subarray(i*44,(i+1)*44),f=j=>a.readFloatLE(j*4),u=j=>a.readUInt32LE(j*4),filter=Float32Array.from([0,1,2,3].map(f));
  const camera={fov:f(6),refreshCounter:u(8),skipUpdate:u(9),refreshByte:u(10)&255};
  stepMcmChaseFov(camera,filter,f(4),f(5),u(7));const actual=Buffer.alloc(32);filter.forEach((v,j)=>actual.writeFloatLE(v,j*4));actual.writeFloatLE(camera.fov,16);actual.writeUInt32LE(camera.refreshCounter,20);
  beginMcmCameraUpdate(camera);actual.writeUInt32LE(camera.refreshCounter,24);actual.writeUInt32LE(camera.refreshByte,28);
  for(let j=0;j<8;j++)if(actual.readUInt32LE(j*4)!==output.readUInt32LE(i*32+j*4)){differences++;if(examples.length<10)examples.push({case:i,word:j,expected:output.readUInt32LE(i*32+j*4),actual:actual.readUInt32LE(j*4)});}
 }
 return {cases:input.length/44,words:output.length/4,differences,examples};
}
