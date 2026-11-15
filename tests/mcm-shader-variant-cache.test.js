import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{lookupMcmShaderVariant}from'../src/physics/mcm/shader-variant-cache.js';
test('variant lookup matches 4096 native scans with creation explicitly bounded',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-variant-cache-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');assert.equal(input.length,4096*516);assert.equal(output.length,4096*4);assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);
 let hits=0,misses=0;
 for(let c=0;c<4096;c++){
  const b=input.subarray(c*516,(c+1)*516),kind=b.readUInt32LE(),mask=b.readUInt32LE(4),present=b.readUInt32LE(8),count=b.readUInt32LE(12),size=kind===0?24:52;
  const entries=present?Array.from({length:count},(_,i)=>b.subarray(68+i*56,68+i*56+size+4)):null;
  const found=lookupMcmShaderVariant({kind,mask,query:b.subarray(16,16+size),entries});
  assert.equal(found?.id??0xffffffff,output.readUInt32LE(c*4),`native variant ${c}`);if(found)hits++;else misses++;
 }
 assert.equal(hits,f.provenance.hits);assert.equal(misses,f.provenance.misses);assert.ok(hits>2000);assert.ok(misses>1000);
});
