import fs from'node:fs';import{pathToFileURL}from'node:url';import{propagateMcmTerrainBoundary,descendMcmTerrainBoundary}from'../../src/physics/mcm/terrain-patch-propagation.js';
const BASE=0x21000000;
export function compareTerrainPatchPropagation(input,output){
 if(!input.length||input.length%32)throw Error('Incomplete terrain patch input');const bytes=new ArrayBuffer(0x400000),view=new DataView(bytes),node=p=>new DataView(bytes,p-BASE,0x210),put=(p,v)=>view.setUint32(p-BASE,v>>>0,true),get=p=>view.getUint32(p-BASE,true);
 for(let id=0;id<1281;id++)put(BASE+id*0x400+0x50,BASE+0x800000+id*0x2000);
 put(BASE+0x20,2);put(BASE+0x54,BASE+0x200000);
 for(let i=0;i<256;i++){
  const address=BASE+(i+1)*0x400,table=BASE+0x200400+i*0x400;put(BASE+0x200000+i*4,address);put(address+0x20,1);put(address+0x54,table);put(address+0x58,BASE);put(address+0x30,i);put(address+0x28,(i&15)*16);put(address+0x2c,(i>>4)*16);
  for(let j=0;j<4;j++){const index=(j&1?15:0)+(j&2?240:0),child=BASE+(257+i*4+j)*0x400;put(table+index*4,child);put(child+0x58,address);put(child+0x30,index);}
 }
 let cursor=0,words=0,differences=0;const examples=[];
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),trace=[],env={node,u32:get,vertexRows:Array.from({length:17},(_,i)=>i*17),rowOffsets:Array.from({length:17},(_,i)=>i*16),notifyVertex:(...args)=>trace.push(...args)};
  const source=a[6]?get(BASE+0x50)+((a[3]>>>8)*17+(a[2]>>>8))*16:0;
  if(a[0])propagateMcmTerrainBoundary(BASE,BASE+(1+(a[1]&255))*0x400,a[2],a[3],a[4],a[5],source,env);
  else descendMcmTerrainBoundary(BASE,a[2],a[3],a[4],a[5],source,a[7],env);
  if(cursor+4>output.length)throw Error('Incomplete terrain patch output');const count=output.readUInt32LE(cursor)+1,actual=[trace.length,...trace];if(cursor+count*4>output.length)throw Error('Incomplete terrain patch trace');
  for(let i=0;i<Math.max(count,actual.length);i++){const expected=i<count?output.readUInt32LE(cursor+i*4):null,value=i<actual.length?actual[i]>>>0:null;words++;if(expected!==value){differences++;if(examples.length<16)examples.push({case:n,word:i,actual:value,expected});}}
  cursor+=count*4;
 }
 if(cursor!==output.length)throw Error('Unexpected terrain patch output');return{cases:input.length/32,words,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainPatchPropagation(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
