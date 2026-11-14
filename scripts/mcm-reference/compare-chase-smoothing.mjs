import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {stepMcmChaseSmoothing} from '../../src/physics/mcm/chase-smoothing.js';
export function compareChaseSmoothing(input,output){
 if(!input.length||input.length%128)throw Error('Incomplete smoothing input');let cursor=0,steps=0,differences=0;const examples=[];
 for(let offset=0;offset<input.length;offset+=128){
  const count=input.readUInt32LE(offset+124);if(!count||count>10000||cursor+count*120>output.length)throw Error('Incomplete smoothing output');
  const filters=Array.from({length:6},(_,i)=>Array.from({length:4},(_,j)=>input.readFloatLE(offset+i*16+j*4))),targets=Array.from({length:6},(_,i)=>input.readFloatLE(offset+96+i*4)),delta=input.readFloatLE(offset+120);
  for(let step=0;step<count;step++){
   const result=stepMcmChaseSmoothing(filters,targets,delta),values=new Float32Array(30);
   for(let i=0;i<6;i++)values.set(filters[i],i*4);values.set(result.target,24);values.set(result.eye,27);const words=new Uint32Array(values.buffer);
   for(let i=0;i<30;i++){const native=output.readUInt32LE(cursor+i*4);if(native!==words[i]){differences++;if(examples.length<12)examples.push({case:offset/128,step,index:i,native,actual:words[i]});}}
   cursor+=120;steps++;
  }
 }
 if(cursor!==output.length)throw Error('Trailing smoothing output');return {cases:input.length/128,steps,words:steps*30,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseSmoothing(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
