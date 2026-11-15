import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mcmSamplerFormatStackStore} from '../src/physics/mcm/shader-sampler-format.js';

test('sampler formatter save and text match 480 intact native executions',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-sampler-format-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');
 assert.equal(input.length,480*16);assert.equal(output.length,480*2120);
 assert.equal(createHash('sha256').update(output).digest('hex'),f.provenance.outputSha256);
 assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);
 const offsets=new Set();
 for(let c=0;c<480;c++){
  const a=c*16,b=c*2120,callerEsp=output.readUInt32LE(b);
  assert.equal(callerEsp&15,input.readUInt32LE(a));
  const store=mcmSamplerFormatStackStore({callerEsp});
  const offset=store.address-(callerEsp-0x800);offsets.add(store.address-callerEsp);
  assert.ok(offset>=0&&offset<0x800);assert.notEqual(input.readUInt32LE(a+12),store.value);
  assert.equal(output.readUInt32LE(b+72+offset),store.value,`native save ${c}`);
  const text=['ps','vs','unknown'][input.readUInt32LE(a+4)]+'_sampler'+input.readUInt32LE(a+8);
  assert.equal(output.readUInt32LE(b+4),text.length);
  assert.equal(output.subarray(b+8,b+8+text.length+1).toString(),text+'\0');
 }
 assert.deepEqual([...offsets].sort((a,b)=>a-b),[-0x440,-0x43c,-0x438,-0x434]);
 // Original program-selection body 22f4cc -> ec5e0 body/caller 22f478.
 assert.deepEqual(mcmSamplerFormatStackStore({callerEsp:0x22f478}),{address:0x22f038,value:0});
});
