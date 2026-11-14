import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {deriveMcmChaseFactor} from '../../src/physics/mcm/chase-factor.js';
export function compareChaseFactor(input,output){
 if(!input.length||input.length%180||output.length!==input.length/180*12)throw Error('Incomplete factor capture');
 let differences=0,invalidWords=0;const examples=[];
 for(let o=0;o<input.length;o+=180){
  if(input.readUInt32LE(o+60)!==1)throw Error('Isolated factor requires one step');
  const v=Array.from({length:45},(_,i)=>input.readFloatLE(o+i*4));
  const result=deriveMcmChaseFactor({pitch:v[26],radius:v[27],yaw:v[29]},{source:v.slice(16,19),velocity:v.slice(39,42),denominator5ec:v[42],denominator6a4:v[43],multiplier:v[44],eyeGate:input.readUInt32LE(o+132)}),words=new Uint32Array(result.buffer);
  for(let i=0;i<3;i++){const native=output.readUInt32LE(o/180*12+i*4);if((native&0x7fffffff)>0x7f800000)invalidWords++;if(native!==words[i]){differences++;if(examples.length<12)examples.push({case:o/180,index:i,native,actual:words[i]});}}
 }
 return {cases:input.length/180,words:output.length/4,invalidWords,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseFactor(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
