import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {aimMcmCamera} from '../../src/physics/mcm/camera-target.js';
export function compareCameraTarget(input,output){
 if(!input.length||input.length%68||output.length!==input.length/68*56)throw Error('Incomplete camera target cases');
 let differences=0,unchanged=0;const examples=[];
 for(let offset=0;offset<input.length;offset+=68){
  const camera={values:Array.from({length:10},(_,i)=>input.readFloatLE(offset+i*4)),upValid:input.readUInt32LE(offset+52),forwardValid:input.readUInt32LE(offset+56),refreshCounter:input.readUInt32LE(offset+60)};
  const target=Array.from({length:3},(_,i)=>input.readFloatLE(offset+40+i*4));
  const ret=aimMcmCamera(camera,target,input.readUInt32LE(offset+64));if(!ret)unchanged++;
  const words=[...new Uint32Array(Float32Array.from(camera.values).buffer),camera.upValid,camera.forwardValid,camera.refreshCounter,ret],frame=offset/68;
  for(let i=0;i<14;i++){const native=output.readUInt32LE(frame*56+i*4);if(native!==words[i]){differences++;if(examples.length<12)examples.push({frame,index:i,native,actual:words[i]});}}
 }
 return {cases:input.length/68,words:output.length/4,unchanged,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareCameraTarget(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
