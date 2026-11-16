import fs from'node:fs';import{pathToFileURL}from'node:url';import{setupMcmTerrainView}from'../../src/physics/mcm/terrain-view-setup.js';
export function compareTerrainView(input,output){
 if(!input.length||input.length%32||output.length!==input.length/32*120)throw Error('Incomplete terrain view cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),bytes=new Uint8Array(0xb8).fill(0x55),view=new DataView(bytes.buffer),f=b=>new Float32Array(Uint32Array.of(b).buffer)[0];view.setUint32(0x40,a[0],true);view.setUint32(0x54,a[7],true);
  setupMcmTerrainView(view,{position:a.slice(1,4).map(f),fov:f(a[4]),width:a[5]},a[6]);
  for(let i=0;i<30;i++){const actual=view.getUint32(0x40+i*4,true),expected=output.readUInt32LE(n*120+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,offset:0x40+i*4,actual,expected});}}
 }
 return{cases:input.length/32,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainView(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
