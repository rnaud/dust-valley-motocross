import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {projectMcmCameraPoint} from '../../src/physics/mcm/camera-point.js';
export function compareCameraPoint(input,output){
 if(!input.length||input.length%88||output.length!==input.length/88*20)throw Error('Incomplete camera point cases');
 let differences=0,visible=0;const examples=[],flags=new Set();
 for(let n=0;n<input.length/88;n++){
  const values=Array.from({length:19},(_,i)=>input.readFloatLE(n*88+i*4));
  const r=projectMcmCameraPoint(values.slice(0,16),values.slice(16),input.readUInt32LE(n*88+76),input.readUInt32LE(n*88+80),{screen:!!input.readUInt32LE(n*88+84)});
  visible+=r.visible;flags.add(r.flags);
  const words=[...(r.screen?new Uint32Array(r.screen.buffer):[0xa5a5a5a5,0xa5a5a5a5,0xa5a5a5a5]),r.flags,r.visible];
  words.forEach((actual,i)=>{const expected=output.readUInt32LE(n*20+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,expected,actual});}});
 }
 return {cases:input.length/88,words:output.length/4,visible,clipFlags:[...flags].sort((a,b)=>a-b),differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareCameraPoint(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
