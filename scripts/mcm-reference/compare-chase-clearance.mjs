import {applyMcmChaseClearance} from '../../src/physics/mcm/chase-clearance.js';
export function compareChaseClearance(terrain,input,output){
 if(input.length%48||!input.length||output.length!==input.length/48*24)throw Error('Incomplete clearance oracle data');
 let differences=0;const examples=[];
 for(let i=0;i<input.length/48;i++){
  const a=input.subarray(i*48,(i+1)*48),camera={pitch:a.readFloatLE(24),radius:a.readFloatLE(28)},args={terrain,worldMode:a.readUInt32LE(0),worldEnabled:a.readUInt32LE(4),worldScale:a.readFloatLE(8),eye:[12,16,20].map(j=>a.readFloatLE(j)),sceneName:a.subarray(32).toString('ascii').split('\0')[0]};
  const result=applyMcmChaseClearance(camera,args),actual=Buffer.alloc(24);[...result.eye,camera.pitch].forEach((v,j)=>actual.writeFloatLE(v,j*4));actual.writeUInt32LE(result.special,16);actual.writeFloatLE(result.ground,20);
  for(let j=0;j<6;j++)if(actual.readUInt32LE(j*4)!==output.readUInt32LE(i*24+j*4)){differences++;if(examples.length<10)examples.push({case:i,word:j,expected:output.readUInt32LE(i*24+j*4),actual:actual.readUInt32LE(j*4)});}
 }
 return {cases:input.length/48,words:output.length/4,differences,examples};
}
