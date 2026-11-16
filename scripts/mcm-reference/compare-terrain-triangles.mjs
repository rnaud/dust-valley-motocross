import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {beginMcmTerrainVertices,buildMcmTerrainVertex} from '../../src/physics/mcm/terrain-vertex-builder.js';
import {buildMcmTerrainDiagonal,buildMcmTerrainFallback} from '../../src/physics/mcm/terrain-triangles.js';
export function compareTerrainTriangles(input,output,{fallback=false}={}){
 const stride=8+0x2d34+0x1000;if(!input.length||input.length%32||output.length!==input.length/32*stride)throw Error('Incomplete terrain triangle fixture');
 let words=0,differences=0;const examples=[];
 for(let n=0;n<input.length/32;n++){
  const a=Array.from({length:8},(_,i)=>input.readUInt32LE(n*32+i*4)),arena=new ArrayBuffer(0x10000),memory=new DataView(arena),node=p=>new DataView(arena,p-0x21000000,0x210),root=node(0x21000000),put=(o,v)=>memory.setUint32(o,v>>>0,true);
  const builderBytes=Buffer.alloc(0x2d34,0x5a),indexBytes=Buffer.alloc(0x1000,0x6b),builder=new DataView(builderBytes.buffer,builderBytes.byteOffset,builderBytes.length),indices=new DataView(indexBytes.buffer,indexBytes.byteOffset,indexBytes.length),bank=new DataView(arena,0x8000,0x1654);
  builder.setUint32(4,0xffffffff,true);
  for(const[o,v]of[[0x50,0x21008000],[0x10,a[6]&1?0xbf800000:0x3f000000],[0xc,0x41880000],[0x24,a[6]%5],[0x28,0xfffffff0],[0x2c,32],[0x48,a[5]],[0x1d0,0x3e800000],[0x1d4,0xbe000000],[0x54,a[2]?0x21006000:0],[0x1b4,a[3]]])put(o,v);
  memory.setUint8(0x181,a[4]);let seed=a[0];
  for(let i=0;i<289;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;memory.setUint8(0x60+i,a[1]===0?0:a[1]===1?128:seed>>>24);bank.setUint16(i*16+2,i*37,true);[0x3e800000,0x3f000000,0xbe800000].forEach((v,j)=>bank.setUint32(i*16+4+j*4,v,true));}
  for(let i=0;i<256;i++){const id=i%16+1,p=id*0x400;put(0x6000+i*4,i%7?0x21000000+p:0);put(p+0x1a0,id%4===0?2:0);put(p+0x1ac,id%4===1?3:0);put(p+0x184,id%4!==2?1:0);}
  beginMcmTerrainVertices(builder,0x21000000);
  const env={node,u32:p=>memory.getUint32(p-0x21000000,true),vertexRows:Array.from({length:17},(_,i)=>i*17),rowOffsets:Array.from({length:17},(_,i)=>i*16),indices};
  env.vertex=(x,y)=>buildMcmTerrainVertex(builder,root,bank,x,y,{...env,normalsEnabled:a[6]&2,textureScale:1/16});
  const corner=a[7]&3,result=fallback?{count:buildMcmTerrainFallback(3,corner&1?16:0,corner&2?16:0,corner&1?-16:16,corner&2?-16:16,env),handled:0x12345678}:buildMcmTerrainDiagonal(0x21000000,8,3,corner&1?16:0,corner&2?16:0,corner&1?-8:8,corner&2?-8:8,env),actual=[result.count,result.handled];
  for(const b of[builderBytes,indexBytes])for(let o=0;o<b.length;o+=4)actual.push(b.readUInt32LE(o));
  for(let i=0;i<actual.length;i++){words++;const expected=output.readUInt32LE(n*stride+i*4);if(actual[i]!==expected){differences++;if(examples.length<16)examples.push({case:n,word:i,actual:actual[i],expected});}}
 }
 return{cases:input.length/32,words,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainTriangles(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3]),{fallback:process.argv.includes('--fallback')}),null,2));
