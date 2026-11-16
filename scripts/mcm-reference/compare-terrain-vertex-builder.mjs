import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {beginMcmTerrainVertices,buildMcmTerrainVertex} from '../../src/physics/mcm/terrain-vertex-builder.js';
export function compareTerrainVertexBuilder(input,output){
 if(!input.length||input.length%96)throw Error('Incomplete terrain vertex-builder input');
 const count=input.length/96,stride=0x2d34+8;if(output.length!==count*stride)throw Error('Incomplete terrain vertex-builder output');
 const builder=new DataView(new ArrayBuffer(0x2d34)),node=new DataView(new ArrayBuffer(0x210)),bank=new DataView(new ArrayBuffer(0x1654)),float=new DataView(new ArrayBuffer(4));
 const number=v=>{float.setUint32(0,v,true);return float.getFloat32(0,true);};
 let words=0,differences=0;const examples=[];
 for(let n=0;n<count;n++){
  const a=Array.from({length:24},(_,i)=>input.readUInt32LE(n*96+i*4)),index=a[6]*17+a[5],set=(o,v)=>builder.setUint32(o,v>>>0,true),put=(o,v)=>node.setUint32(o,v>>>0,true);
  for(let i=0;i<0x2d34/4;i++)set(i*4,a[21]+Math.imul(i,0x9e3779b9));
  set(0,0x21000000);set(4,a[1]);set(8+index*8,a[2]);set(12+index*8,a[3]);set(0x2d30,a[4]);
  for(const[o,v]of[[0x28,a[7]],[0x2c,a[8]],[0x24,a[9]],[0xc,a[10]],[0x10,a[11]],[0x48,a[12]],[0x50,0x21005000],[0x1d4,a[15]],[0x1d0,a[16]]])put(o,v);
  bank.setUint16(index*16+2,a[17],true);for(let i=0;i<3;i++)bank.setUint32(index*16+4+i*4,a[18+i],true);
  if(a[0])beginMcmTerrainVertices(builder,0x21000000);
  const options={vertexRows:Array.from({length:17},(_,i)=>i*17),normalsEnabled:a[13],textureScale:number(a[14])},actual=[];
  for(let i=0;i<2;i++)actual.push(buildMcmTerrainVertex(builder,node,bank,a[5],a[6],options));
  for(let i=0;i<0x2d34;i+=4)actual.push(builder.getUint32(i,true));
  for(let i=0;i<actual.length;i++){words++;const expected=output.readUInt32LE(n*stride+i*4);if(actual[i]!==expected){differences++;if(examples.length<16)examples.push({case:n,word:i,actual:actual[i],expected});}}
 }
 return{cases:count,words,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareTerrainVertexBuilder(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
