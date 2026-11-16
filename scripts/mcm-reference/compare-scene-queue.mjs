import fs from 'node:fs';import {pathToFileURL}from'node:url';import{tickMcmSceneQueue}from'../../src/physics/mcm/scene-queue-tick.js';
export function compareSceneQueue(input,output){
 if(!input.length||input.length%32||output.length!==input.length/32*24)throw Error('Incomplete scene queue cases');
 let differences=0,removals=0;const examples=[],base=0x21000000,head=i=>i?base+i*256:0;
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),b=Buffer.alloc(0x1000);let freed=0,children=0;
  const memory={u32:p=>b.readUInt32LE(p-base),f32:p=>b.readFloatLE(p-base),put32:(p,v)=>b.writeUInt32LE(v,p-base),putFloat:(p,v)=>b.writeFloatLE(v,p-base)};
  for(const [o,v]of [[0x54,head(a[0])],[0x180,a[2]],[0x184,a[3]],[0x188,head(2)],[0x280,a[4]],[0x284,a[5]]])memory.put32(base+o,v);
  const result=tickMcmSceneQueue(base,new Float32Array(Uint32Array.of(a[6]).buffer)[0],memory,{children(){children++;memory.put32(base+0x54,head(a[1]));},free(p){freed=p;if(a[7]!==3)memory.put32(base+0x54,head(a[7]));}});
  if(freed)removals++;
  [result,memory.u32(base+0x54),memory.u32(base+0x184),memory.u32(base+0x284),freed,children].forEach((actual,i)=>{const expected=output.readUInt32LE(n*24+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/32,words:output.length/4,removals,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareSceneQueue(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
