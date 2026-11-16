import fs from'node:fs';import{pathToFileURL}from'node:url';import{projectMcmSphere}from'../../src/physics/mcm/projected-sphere.js';
export function compareProjectedSphere(input,output){
 if(!input.length||input.length%128||output.length!==input.length/128*8)throw Error('Incomplete projected sphere cases');let differences=0;const examples=[];
 for(let n=0;n<input.length/128;n++){
  const camera=new DataView(new ArrayBuffer(0x200)),base=n*128;[0x78,0x88,0x98,0xa8,0x1a8,0x1ac,0xf0,0x100,0x110,0x120].forEach((o,i)=>camera.setUint32(o,input.readUInt32LE(base+i*4),true));
  const result=projectMcmSphere({camera,matrix:Array.from({length:16},(_,i)=>input.readFloatLE(base+40+i*4)),center:[0,1,2].map(i=>input.readFloatLE(base+104+i*4)),radius:input.readFloatLE(base+116),wantInside:!!input.readUInt32LE(base+120),inside:input.readUInt32LE(base+124)});
  [result.accepted,result.inside].forEach((actual,i)=>{const expected=output.readUInt32LE(n*8+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/128,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareProjectedSphere(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
