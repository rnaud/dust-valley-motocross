import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{mcmFixedVertexDescriptor}from'../src/physics/mcm/fixed-vertex-descriptor.js';
test('fixed-function vertex descriptor matches 8192 intact native cases',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/fixed-vertex-descriptor-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,8192*140);assert.equal(output.length,8192*44);assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);
 for(let c=0;c<8192;c++){
  const b=input.subarray(c*140,(c+1)*140);
  const state=Array.from({length:14},(_,i)=>b.readUInt32LE(8+i*4)).concat([...b.subarray(64,68)]);
  const r=mcmFixedVertexDescriptor({declaration:b.subarray(0,6),state,textureCoordinates:Array.from({length:8},(_,i)=>b.readUInt32LE(68+i*4)),lights:Array.from({length:8},(_,i)=>b.readUInt32LE(100+i*4)),capabilities:b.subarray(132,134),streamFlags:b.readUInt32LE(136)});
  assert.deepEqual(Buffer.from(r),output.subarray(c*44,(c+1)*44),`native descriptor ${c}`);
 }
});
