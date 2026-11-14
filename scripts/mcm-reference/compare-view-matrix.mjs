import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {composeMcmViewMatrix} from '../../src/physics/mcm/view-matrix.js';
export function compareViewMatrix(input,output){
 if(!input.length||input.length%40||output.length!==input.length/40*64)throw Error('Incomplete view matrix cases');
 let differences=0;const examples=[];
 for(let offset=0;offset<input.length;offset+=40){
  const args=Array.from({length:10},(_,i)=>input.readFloatLE(offset+i*4));
  const result=new Uint32Array(composeMcmViewMatrix(args).buffer),frame=offset/40;
  for(let i=0;i<16;i++){const native=output.readUInt32LE(frame*64+i*4);if(native!==result[i]){differences++;if(examples.length<12)examples.push({frame,index:i,native,actual:result[i]});}}
 }
 return {cases:input.length/40,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareViewMatrix(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
