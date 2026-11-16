import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {emitMcmTerrain} from '../../src/physics/mcm/terrain-emission.js';
import {allocateMcmOwned,freeMcmOwned} from '../../src/physics/mcm/owned-allocation.js';
export function compareTerrainEmission(input,output){
 if(!input.length||input.length%32)throw Error('Incomplete terrain emission input');
 let cursor=0,words=0,differences=0;const examples=[];
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),bytes=Buffer.alloc(0x30000),memory=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),node=p=>new DataView(bytes.buffer,bytes.byteOffset+p-0x21000000,0x210),put=(o,v)=>memory.setUint32(o,v>>>0,true);
  bytes.fill(0xa5,0x10000);const builderBytes=Buffer.alloc(0x2d34,0x5a),indexBytes=Buffer.alloc(0x1000,0x6b),builder=new DataView(builderBytes.buffer,builderBytes.byteOffset,builderBytes.length),indices=new DataView(indexBytes.buffer,indexBytes.byteOffset,indexBytes.length);builder.setUint32(4,0xffffffff,true);
  let seed=a[0];for(let id=0;id<4;id++){
   const p=id*0x400;
   for(const[o,v]of[[0x50,0x21006000],[0x10,id&1?0xbf800000:0x3f000000],[0xc,0x41880000],[0x24,id],[0x28,id*16],[0x2c,id*32],[0x30,id===2?255:a[5]],[0x48,a[5]%9],[0x1d0,0x3e800000],[0x1d4,0xbe000000],[0x1d8,0x3d800000],[0x5c,0x21004000],[0x54,id===0&&a[2]?0x21008000:0],[0x58,id===0?0x21000c00:id<3?0x21000000:0],[0x1b4,id===3?a[4]&1:(a[4]>>id)&1],[0x184,id===0?a[1]:(a[1]>>id)&1],[0x1a0,id],[0x1a4,id&1],[0x1a8,(id+1)&1],[0x1ac,id+7]])put(p+o,v);
   memory.setUint8(p+0x181,a[3]&1);memory.setUint8(p+0x182,(a[3]>>1)&1);
   for(let i=0;i<289;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;memory.setUint8(p+0x60+i,a[7]%3===0?0:a[7]%3===1?128:seed>>>24);}
  }
  put(0x8000,0x21000400);put(0x8000+255*4,0x21000800);
  for(let i=0;i<289;i++){memory.setUint16(0x6000+i*16+2,i*37,true);[0x3e800000,0x3f000000,0xbe800000].forEach((v,j)=>put(0x6000+i*16+4+j*4,v));}
  let used=0,requests=0;const trace=[],accounting={bytes:a[0]},failEvery=a[6]&1?2:0;
  const heap={malloc(size){requests++;let pointer=0;if(!failEvery||requests%failEvery){if(used+size+16>0x20000)throw Error('Heap overflow');pointer=0x21010000+used+16;put(pointer-0x21000000-4,size);used=(used+((size+31)&~15))>>>0;}trace.push(1,size,pointer);return pointer;},free(pointer){trace.push(2,pointer);},size(pointer){trace.push(3,pointer);return memory.getUint32(pointer-0x21000000-4,true);}};
  const owned=address=>({get bytes(){return node(address).getUint32(8,true);},set bytes(v){node(address).setUint32(8,v,true);}});
  const env={node,owner:p=>new DataView(bytes.buffer,bytes.byteOffset+p-0x21000000,0x600),bank:p=>new DataView(bytes.buffer,bytes.byteOffset+p-0x21000000,0x1654),u32:p=>memory.getUint32(p-0x21000000,true),builder,indices,textureScale:0.5,normalsEnabled:a[6]&2,vertexRows:Array.from({length:17},(_,i)=>i*17),rowOffsets:Array.from({length:17},(_,i)=>i*16),malloc:(p,size)=>allocateMcmOwned(owned(p),accounting,heap,size),free:(p,ptr)=>freeMcmOwned(owned(p),accounting,heap,ptr),copy:(p,source,size)=>bytes.set(source.subarray(0,size),p-0x21000000)};
  let result=emitMcmTerrain(0x21000000,0,0,16,0,env);if(a[7]&4){for(let id=0;id<3;id++){memory.setUint8(id*0x400+0x182,1);bytes.fill(a[7]&1?128:0,id*0x400+0x60,id*0x400+0x181);}result=emitMcmTerrain(0x21000000,0,0,16,0,env);}
  const f=new DataView(new ArrayBuffer(4));f.setFloat32(0,env.textureScale,true);
  const actual=[result,accounting.bytes,f.getUint32(0,true),used,trace.length];for(const b of[...Array.from({length:4},(_,id)=>bytes.subarray(id*0x400,id*0x400+0x210)),bytes.subarray(0x4000,0x4600),builderBytes,indexBytes,bytes.subarray(0x10000,0x10000+used)])for(let i=0;i<b.length;i+=4)actual.push(b.readUInt32LE(i));actual.push(...trace);
  if(cursor+20>output.length)throw Error('Incomplete terrain emission header');const count=(20+4*0x210+0x600+0x2d34+0x1000+output.readUInt32LE(cursor+12))/4+output.readUInt32LE(cursor+16);if(cursor+count*4>output.length)throw Error('Incomplete terrain emission output');
  for(let i=0;i<Math.max(actual.length,count);i++){words++;const expected=i<count?output.readUInt32LE(cursor+i*4):null,value=i<actual.length?actual[i]:null;if(value!==expected){differences++;if(examples.length<16)examples.push({case:n,word:i,actual:value,expected});}}
  cursor+=count*4;
 }
 if(cursor!==output.length)throw Error('Unexpected terrain emission output');return{cases:input.length/32,words,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainEmission(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
