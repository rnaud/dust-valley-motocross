import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {mcmRenderResourceUpload} from '../src/physics/mcm/render-resource-upload.js';
import {analyzeRenderResourceUploads} from '../scripts/mcm-reference/analyze-render-resource-upload.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`,import.meta.url))));
test('native upload routine matches cached, created and failed resources across all eight kinds',()=>{
 const fixture=read('render-resource-upload-wine11'),input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 assert.equal(input.length,4096*36);assert.equal(output.length,4096*104);
 let cached=0,created=0,failed=0;const kinds=new Set();
 for(let i=0;i<4096;i++){
  const [kind,flags,offset,count,data,cachedResource,createdResource,createResult,adapterFlags]=Array.from({length:9},(_,j)=>input.readUInt32LE(i*36+j*4));
  const r=mcmRenderResourceUpload({kind,flags,offset,count,data,cachedResource,createdResource,createResult,adapterFlags}),u=r.update;
  kinds.add(kind);if(cachedResource)cached++;else if(u)created++;else failed++;
  const actual=[Number(!!u),...(u?[u.resource,u.subresource,u.source,u.rowPitch,u.slicePitch,...u.box]:Array(11).fill(0)),
   ...(r.command?[...r.command]:Array(5).fill(0)),Number(!!r.command),Number(!!r.creation),...(r.creation??Array(6).fill(0)),r.resource];
  for(let j=0;j<26;j++)assert.equal(actual[j],output.readUInt32LE(i*104+j*4),`case ${i}, word ${j}`);
 }
 assert.equal(kinds.size,8);assert.equal(cached,2048);assert.ok(created>0);assert.ok(failed>0);assert.equal(created+failed,2048);
});
const live=read('render-resource-upload-live-wine11');
test('live upload arguments join through resource staging, heap stores and post-upload commands',()=>{
 assert.deepEqual(analyzeRenderResourceUploads(live.cases,live.heapHandle),{uploads:192,allocatedBytes:20336,heapStores:192,postUploadCommands:192,kinds:{6:172,7:20}});
 assert.match(live.provenance.cleanup,/debugger=0 clean=1/);
});
test('upload audit rejects wrong cached handles and altered follow-up commands',()=>{
 const bad=structuredClone(live.cases);bad[0].config.cachedResource+=4;
 assert.throws(()=>analyzeRenderResourceUploads(bad,live.heapHandle),/Resource resource differs/);
 const flags=structuredClone(live.cases);flags[0].command.words[4]^=1;
 assert.throws(()=>analyzeRenderResourceUploads(flags,live.heapHandle),/Post-upload command differs/);
});
