import fs from 'node:fs';import{pathToFileURL}from'node:url';import{updateMcmSceneVisibility}from'../../src/physics/mcm/scene-visibility.js';
export function compareSceneVisibility(input,output){
 if(!input.length||input.length%28||input.length!==output.length)throw Error('Incomplete scene visibility cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/28;n++){
  const a=Array.from({length:7},(_,i)=>input.readUInt32LE(n*28+i*4)),view=new DataView(new ArrayBuffer(0x11c));let calls=0;
  [0xfc,0x100,0x104,0x118,0x108,0x10c].forEach((o,i)=>view.setUint32(o,a[i>=4?i+1:i],true));
  const result=updateMcmSceneVisibility(view,()=>{calls++;return a[4];});
  [result,...[0x100,0x104,0x118,0x108,0x10c].map(o=>view.getUint32(o,true)),calls].forEach((actual,i)=>{const expected=output.readUInt32LE(n*28+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/28,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareSceneVisibility(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
