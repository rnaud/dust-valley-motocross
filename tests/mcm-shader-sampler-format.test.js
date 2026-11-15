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

import {analyzeSamplerFormatter} from '../scripts/mcm-reference/analyze-sampler-formatter.mjs';
import {analyzeIndexedDrawWindows} from '../scripts/mcm-reference/analyze-indexed-draw-windows.mjs';
const liveFixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-format-windows-wine11.json.br',import.meta.url))));
test('live sampler stack chain predicts all 16 overlapping register saves',()=>{
 const f=liveFixture(),r=analyzeSamplerFormatter(f.render),draws=analyzeIndexedDrawWindows(f.render);
 assert.deepEqual({...r,stores:undefined},{bindings:1,formats:8,callbacks:24,overlappingSaves:16,stores:undefined});
 assert.deepEqual(r.stores,Array.from({length:16},()=>({frame:23,address:0x22f038,value:0})));
 assert.equal(draws.completeDraws,8238);assert.equal(draws.pendingDraws,0);
 assert.deepEqual(draws.changes,[
  {frame:23,before:'shader-ucrt-733c0',after:'shader-ucrt-733ee',esp:0x22f03c,from:1064518239,to:0x7bb733ee},
  {frame:23,before:'shader-ucrt-733c0',after:'shader-ucrt-733ee',esp:0x22f02c,from:0x7bb733ee,to:0},
 ]);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,270);assert.match(f.provenance.run,/captured=84 status=1/);
});
test('live formatter rejects altered stores, stack positions and missing entries',()=>{
 let f=liveFixture(),start=f.render.findIndex(r=>r.phase==='shader-ec5e0');
 f.render.find((r,i)=>i>start&&r.phase==='shader-ucrt-733ee').value=1;
 assert.throws(()=>analyzeSamplerFormatter(f.render),/Sampler formatter register save/);
 f=liveFixture();start=f.render.findIndex(r=>r.phase==='shader-ec5e0');
 f.render.find((r,i)=>i>start&&r.phase==='shader-138260').esp+=4;
 assert.throws(()=>analyzeSamplerFormatter(f.render));
 f=liveFixture();start=f.render.findIndex(r=>r.phase==='shader-ec5e0');
 f.render.splice(f.render.findIndex((r,i)=>i>start&&r.phase==='shader-138260'),1);
 assert.throws(()=>analyzeSamplerFormatter(f.render),/Missing formatter entry/);
 f=liveFixture();start=f.render.findIndex(r=>r.phase==='shader-ec5e0');
 const first=f.render.findIndex((r,i)=>i>start&&r.phase==='shader-138260');
 const end=f.render.findIndex((r,i)=>i>first&&r.phase==='shader-ec6cf');
 f.render.splice(first,end-first+1);
 assert.throws(()=>analyzeSamplerFormatter(f.render),/Missing derived sampler formats/);
 f=liveFixture();f.render.find(r=>r.phase==='shader-ec65b').result^=4;
 assert.throws(()=>analyzeSamplerFormatter(f.render),/Sampler map pointer/);
});
