import fs from'node:fs';import{pathToFileURL}from'node:url';import{testMcmTerrainVertex}from'../../src/physics/mcm/terrain-vertex-distance.js';
export function compareTerrainVertexDistance(input,output){
 if(!input.length||input.length%64||output.length!==input.length/64*8)throw Error('Incomplete terrain vertex-distance cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/64;n++){
  const a=Array.from({length:16},(_,i)=>input.readUInt32LE(n*64+i*4)),node=new DataView(new ArrayBuffer(0x210)),owner=new DataView(new ArrayBuffer(0x100)),bank=new DataView(new ArrayBuffer(0x1210)),inverse=new Uint16Array(256),rows=Array.from({length:17},(_,i)=>i*17);
  for(const[o,i]of[[0x28,0],[0x2c,1],[0x24,2],[0xc,7],[0x10,8],[0x204,9]])node.setUint32(o,a[i],true);for(const[o,i]of[[0x48,10],[0x4c,11],[0x50,12],[0x60,13],[0x88,14]])owner.setUint32(o,a[i],true);
  const offset=(a[4]*17+a[3])*16;bank.setUint8(offset+1,a[15]);bank.setUint16(offset+2,a[6],true);inverse[a[15]&255]=a[5];
  const result=testMcmTerrainVertex(node,owner,bank,rows,inverse,a[3],a[4]);[result,owner.getUint32(0x88,true)].forEach((actual,i)=>{const expected=output.readUInt32LE(n*8+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }return{cases:input.length/64,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainVertexDistance(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
