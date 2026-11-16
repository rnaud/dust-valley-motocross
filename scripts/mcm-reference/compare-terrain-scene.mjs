import fs from 'node:fs';import{pathToFileURL}from'node:url';import{tickMcmTerrainScene}from'../../src/physics/mcm/terrain-scene-tick.js';
export function compareTerrainScene(input,output){
 if(!input.length||input.length%32||output.length!==input.length/32*84)throw Error('Incomplete terrain scene cases');let differences=0;const examples=[],base=0x21000000;
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),words=new Map([[base+0x1c,base+0x1000],[base+0x102c,0x12345678],[base+0x112c,0x87654321],[base+0x958,a[0]],[base+0x95c,a[1]]]),trace=[];let calls=0;
  const memory={u32:p=>{if(!words.has(p))throw Error('Missing terrain word');return words.get(p);},put32:(p,v)=>words.set(p,v>>>0)};
  const result=tickMcmTerrainScene(base,memory,{clock(){trace.push(1,calls);if(!calls&&a[6]){words.set(base+0x958,a[4]);words.set(base+0x95c,a[5]);words.set(base+0x1c,base+0x1100);}return a[calls++?3:2];},prepare(p,pending,camera,mode){trace.push(2,p,pending,camera,mode);words.set(base+0x95c,0xffffffff);words.set(base+0x9f0,0xdeadbeef);return a[7];}});
  [result,words.get(base+0x958),words.get(base+0x95c),words.get(base+0x9f0),trace.length,...trace,...Array(16-trace.length).fill(0)].forEach((actual,i)=>{const expected=output.readUInt32LE(n*84+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/32,words:output.length/4,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainScene(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
