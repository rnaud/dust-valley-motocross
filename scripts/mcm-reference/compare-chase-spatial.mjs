import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {deriveMcmChaseSource,deriveMcmChaseBase} from '../../src/physics/mcm/chase-spatial-inputs.js';
export function compareChaseSpatial(kind,input,output){
 if(!['source','base'].includes(kind))throw Error('Unknown spatial kind');const stride=kind==='source'?32:44;
 if(!input.length||input.length%stride||output.length!==input.length/stride*16)throw Error('Incomplete spatial capture');let differences=0;const examples=[];
 for(let o=0;o<input.length;o+=stride){
  const v=Array.from({length:stride/4},(_,i)=>input.readFloatLE(o+i*4));let values;
  if(kind==='source'){const r=deriveMcmChaseSource({direction:v.slice(0,3),velocity:v.slice(3,6),bike6a4:v[6],bike620:input.readUInt32LE(o+28)});values=Float32Array.from([...r.source,r.squaredLength]);}
  else{const r=deriveMcmChaseBase({position:v.slice(0,3),velocity:v.slice(3,6),delta:v[6],usePrevious:input.readUInt32LE(o+28),previousTarget:v.slice(8,11)});values=Float32Array.from([...r.base,r.predictionDelta??0]);}
  const words=new Uint32Array(values.buffer);for(let i=0;i<4;i++){const native=output.readUInt32LE(o/stride*16+i*4);if(native!==words[i]){differences++;if(examples.length<12)examples.push({case:o/stride,index:i,native,actual:words[i]});}}
 }
 return {cases:input.length/stride,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseSpatial(process.argv[2],fs.readFileSync(process.argv[3]),fs.readFileSync(process.argv[4])),null,2));
