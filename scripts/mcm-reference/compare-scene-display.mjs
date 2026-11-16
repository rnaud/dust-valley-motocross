import fs from'node:fs';import{pathToFileURL}from'node:url';import{tickMcmSceneDisplay}from'../../src/physics/mcm/scene-display-tick.js';
export function compareSceneDisplay(input,output){
 if(!input.length||input.length%64||output.length!==input.length/64*152)throw Error('Incomplete scene display cases');let differences=0,refreshes=0,maps=0,visibilityCalls=0;const examples=[],base=0x21000000,bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
 for(let n=0;n<input.length/64;n++){
  const a=Array.from({length:16},(_,i)=>input.readUInt32LE(n*64+i*4)),mem=new Map(),trace=[],u32=p=>{if(!mem.has(p))throw Error('Missing oracle memory');return mem.get(p);},put32=(p,v)=>mem.set(p,v>>>0),f32=p=>new Float32Array(Uint32Array.of(u32(p)).buffer)[0],putFloat=(p,v)=>put32(p,bits(v));
  for(const[p,v]of[[0x4e4fb4,base+0x1000],[base+0x16f4,a[3]],[0x4e2ef0,a[4]],[0x4e2ef4,a[2]],[0x4e2ef8,a[13]],[base+0x100,a[0]],[base+0x260,a[5]],[base+0xf8,base+0x2000],[base+0xfc,base+0x3000],[base+0x2030,base+0x4000+a[7]*0x1000],[base+0x31ec,base+0x4000+a[8]*0x1000]])put32(p,v);
  for(let i=0;i<3;i++){put32(base+0x234+i*4,base+0x4000+i*0x1000);put32(base+0x4434+i*0x1000,base+0x7000+i*0x200);put32(base+0x712c+i*0x200,(a[6]>>i)&1);put32(base+0x264+i*4,base+0x8000+i*0x100);}
  const result=tickMcmSceneDisplay(base,new Float32Array(Uint32Array.of(a[1]).buffer)[0],{u32,f32,put32,putFloat},{children(p,dt){trace.push(1,p,bits(dt));put32(base+0x16f4,a[9]);put32(0x4e2ef0,a[10]);},refresh(p){refreshes++;trace.push(2,p);if(a[11]){putFloat(base+0x100,2.5);put32(0x4e2ef4,7);}},rectangle(p,r){trace.push(3,p,...r);},map(p){maps++;trace.push(4,p);},visibility(p,method){visibilityCalls++;trace.push(5,p,method);if(a[12])put32(base+0x260,0);}});
  [result,u32(base+0x100),u32(0x4e2ef4),u32(0x4e2ef8),u32(base+0x260),trace.length,...trace,...Array(32-trace.length).fill(0)].forEach((actual,i)=>{const expected=output.readUInt32LE(n*152+i*4);if(actual!==expected){differences++;if(examples.length<12)examples.push({case:n,word:i,actual,expected});}});
 }
 return{cases:input.length/64,words:output.length/4,refreshes,maps,visibilityCalls,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareSceneDisplay(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
