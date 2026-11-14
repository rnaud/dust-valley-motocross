import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {rotateMcmRuntimeVector} from '../../src/physics/mcm/runtime-vector-rotation.js';
export function compareRuntimeVectorRotation(input,output){
 if(!input.length||input.length%28||output.length!==input.length/28*36)throw Error('Incomplete runtime rotation capture');
 let differences=0;const examples=[];
 for(let offset=0;offset<input.length;offset+=28){
  const args=Array.from({length:7},(_,i)=>input.readFloatLE(offset+i*4)),vector=args.slice(0,3),axis=args.slice(3,6);
  const result=rotateMcmRuntimeVector(vector,axis,args[6]);
  const words=new Uint32Array(Float32Array.from([...result,...axis,...vector]).buffer);
  for(let i=0;i<9;i++){
   const native=output.readUInt32LE(offset/28*36+i*4);
   if(words[i]!==native){differences++;if(examples.length<12)examples.push({case:offset/28,index:i,native,actual:words[i]});}
  }
 }
 return {cases:input.length/28,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareRuntimeVectorRotation(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
