import fs from'node:fs';import{pathToFileURL}from'node:url';import{measureMcmTerrainNode}from'../../src/physics/mcm/terrain-node-distance.js';
export function compareTerrainNodeDistance(input,output){
 if(!input.length||input.length%64||output.length!==input.length/64*24)throw Error('Incomplete terrain distance cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/64;n++){
  const a=Array.from({length:16},(_,i)=>input.readUInt32LE(n*64+i*4)),node=new DataView(new ArrayBuffer(0x210)),owner=new DataView(new ArrayBuffer(0x100));
  for(let i=0;i<3;i++)owner.setUint32(0x48+i*4,a[i],true);for(let i=0;i<4;i++)node.setUint32(0x1dc+i*4,a[i+3],true);
  for(const[o,i]of[[0x14,7],[0x18,8],[0x208,11],[0x188,12],[0x18c,13]])node.setUint32(o,a[i],true);for(const[o,i]of[[0x54,9],[0x5c,10],[0x90,14]])owner.setUint32(o,a[i],true);
  const result=measureMcmTerrainNode(node,owner),bits=new Uint32Array(Float32Array.of(result).buffer)[0];
  [bits,...[0x188,0x18c,0x190,0x194].map(o=>node.getUint32(o,true)),owner.getUint32(0x90,true)].forEach((actual,i)=>{const expected=output.readUInt32LE(n*24+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/64,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainNodeDistance(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
