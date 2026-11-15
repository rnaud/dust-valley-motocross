import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{compareMcmShaderProgramKey,lookupMcmShaderProgramCache}from'../src/physics/mcm/shader-program-cache.js';
test('program key comparison matches all 4096 intact native cases',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-program-key-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');
 assert.equal(input.length,4096*48);assert.equal(output.length,4096*4);assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);const counts={};
 for(let c=0;c<4096;c++){
  const words=Array.from({length:12},(_,j)=>input.readUInt32LE(c*48+j*4)),native=output.readInt32LE(c*4);
  assert.equal(compareMcmShaderProgramKey(words.slice(0,6),words.slice(6)),native,`native key ${c}`);counts[native]=(counts[native]??0)+1;
 }
 assert.deepEqual(counts,{'0':585,'1':1688,'-1':1823});
});
test('cache traversal rejects missing and cyclic state instead of treating it as a miss',()=>{
 const key=[1,0,0,0,0,0];assert.throws(()=>lookupMcmShaderProgramCache(key,4,new Map()),/Missing shader program cache node/);
 const nodes=new Map([[4,{key:[0,0,0,0,0,0],left:0,right:4}]]);
 assert.throws(()=>lookupMcmShaderProgramCache(key,4,nodes),/Cyclic shader program cache/);
});

import{analyzeShaderProgramCache}from'../scripts/mcm-reference/analyze-shader-program-cache.mjs';
const live=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-program-cache-wine11.json.br',import.meta.url))));
test('live program-cache hits and creation match retained membership and native comparisons',()=>{
 const f=live(),r=analyzeShaderProgramCache(f.rows);
 assert.deepEqual(r,f.result);assert.equal(r.misses,1);assert.ok(r.hits>300);
 assert.equal(r.snapshots,2);assert.equal(r.seededNodes,4032);
 assert.equal(r.samplerCalls,1);assert.equal(r.samplerFormats,8);assert.equal(r.pending,0);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
});
test('live cache checker rejects missing comparisons, changed creation and unearned snapshot state',()=>{
 let f=live();let i=f.rows.findIndex(r=>r.phase==='program-cache-compare');f.rows.splice(i,1);
 assert.throws(()=>analyzeShaderProgramCache(f.rows));
 f=live();i=f.rows.findIndex(r=>r.phase==='program-cache-result'&&r.miss===1);
 f.rows.slice(i).find(r=>r.phase==='program-cache-return').value+=4;
 assert.throws(()=>analyzeShaderProgramCache(f.rows),/Cache membership differs/);
 f=live();f.rows.filter(r=>r.nodes)[1].nodes[0].key[5]^=1;
 assert.throws(()=>analyzeShaderProgramCache(f.rows),/Cache membership differs/);
 f=live();f.rows.shift();assert.throws(()=>analyzeShaderProgramCache(f.rows),/without lookup input/);
});
