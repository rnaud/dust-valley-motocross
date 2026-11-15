import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{analyzeFixedVertex}from'../scripts/mcm-reference/analyze-fixed-vertex.mjs';
const live=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/fixed-vertex-live-wine11.json.br',import.meta.url))));
test('live descriptor inputs compute vertex-cache selection and program-key word',()=>{
 const f=live(),r=analyzeFixedVertex(f.rows);assert.deepEqual(r,f.result);
 assert.ok(r.inputs>0);assert.equal(r.inputs,r.descriptors);assert.equal(r.hits,r.keyWords);assert.equal(r.pending,false);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
});
test('live vertex chain rejects changed inputs, descriptor observations and selected IDs',()=>{
 let f=live();f.rows.find(r=>r.phase==='fixed-vertex-input').words[34]^=0x80000000;
 assert.throws(()=>analyzeFixedVertex(f.rows),/Fixed vertex descriptor/);
 f=live();f.rows.find(r=>r.phase==='fixed-vertex-cache').key[0]^=1;
 assert.throws(()=>analyzeFixedVertex(f.rows),/Fixed vertex descriptor/);
 f=live();const selected=f.rows.find(r=>r.phase==='fixed-vertex-result'&&!r.miss).node;
 f.rows.find(r=>r.phase==='fixed-vertex-cache').nodes.find(n=>n.id===selected).program^=1;
 assert.throws(()=>analyzeFixedVertex(f.rows),/Derived vertex program key/);
});
