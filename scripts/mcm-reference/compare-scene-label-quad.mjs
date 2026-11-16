import fs from 'node:fs';
import {buildMcmSceneLabelQuad} from '../../src/physics/mcm/scene-label-quad.js';
export function compareSceneLabelQuad(input,output){
 if(!input.length||input.length%308||output.length!==input.length/308*284)throw Error('Incomplete label quad cases');
 let differences=0;const examples=[];
 for(let n=0;n<input.length/308;n++){
  const a=input.subarray(n*308,(n+1)*308),b=Buffer.from(a.subarray(0,284));
  buildMcmSceneLabelQuad(new DataView(b.buffer,b.byteOffset,b.length),{viewport:Array.from({length:4},(_,i)=>a.readUInt32LE(284+i*4)),textureWidth:a.readInt32LE(300),textureHeight:a.readInt32LE(304)});
  for(let o=0;o<284;o+=4){const actual=b.readUInt32LE(o),expected=output.readUInt32LE(n*284+o);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,offset:o,actual,expected});}}
 }
 return {cases:input.length/308,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify(compareSceneLabelQuad(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
