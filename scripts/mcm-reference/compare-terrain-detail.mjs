import fs from'node:fs';import{pathToFileURL}from'node:url';import{updateMcmTerrainDetail}from'../../src/physics/mcm/terrain-detail.js';
export function compareTerrainDetail(input,output){
 if(!input.length||input.length%8||output.length!==input.length*2)throw Error('Incomplete terrain detail cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/8;n++){
  const view=new DataView(new ArrayBuffer(0x6c));view.setUint32(0x54,input.readUInt32LE(n*8),true);view.setUint32(0x58,input.readUInt32LE(n*8+4),true);updateMcmTerrainDetail(view);
  [0x5c,0x60,0x64,0x68].forEach((o,i)=>{const actual=view.getUint32(o,true),expected=output.readUInt32LE(n*16+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,offset:o,actual,expected});}});
 }
 return{cases:input.length/8,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainDetail(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
