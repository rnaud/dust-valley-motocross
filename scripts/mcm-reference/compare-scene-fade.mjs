import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {tickMcmSceneFade} from '../../src/physics/mcm/scene-fade-tick.js';
export function compareSceneFade(input,output){
 if(!input.length||input.length%24||output.length!==input.length)throw Error('Incomplete scene fade cases');
 let differences=0;const examples=[];
 for(let n=0;n<input.length/24;n++){
  const a=Array.from({length:6},(_,i)=>input.readUInt32LE(n*24+i*4)),bytes=new ArrayBuffer(0x11c),view=new DataView(bytes);
  [0x108,0x10c,0x110,0x114,0xe4].forEach((o,i)=>view.setUint32(o,a[i===4?5:i],true));
  const result=tickMcmSceneFade(view,new Float32Array(Uint32Array.of(a[4]).buffer)[0]);
  [result,...[0x108,0x10c,0x110,0x114,0xe4].map(o=>view.getUint32(o,true))].forEach((actual,i)=>{const expected=output.readUInt32LE(n*24+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/24,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareSceneFade(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
