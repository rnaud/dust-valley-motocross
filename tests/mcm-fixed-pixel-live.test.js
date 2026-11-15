import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';
import{analyzeFixedPixel}from'../scripts/mcm-reference/analyze-fixed-pixel.mjs';import{analyzeFixedVertex}from'../scripts/mcm-reference/analyze-fixed-vertex.mjs';
const live=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/fixed-pixel-live-wine11.json.br',import.meta.url))));
test('live vertex and pixel descriptors predict both cache-selected key words',()=>{
 const f=live(),r=analyzeFixedPixel(f.rows),v=analyzeFixedVertex(f.rows);assert.deepEqual(r,f.result);
 assert.ok(r.inputs>0);assert.equal(r.inputs,r.descriptors);assert.equal(r.hits,r.keyWords);assert.equal(r.pending,false);assert.ok(r.derivedSeedBytes>0);assert.equal(v.keyWords*44,r.derivedSeedBytes);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
});
test('live pixel chain rejects changed upstream seeds, descriptors and selected IDs',()=>{
 let f=live();f.rows.find(r=>r.phase==='fixed-vertex-input').words[34]^=1;
 assert.throws(()=>analyzeFixedPixel(f.rows),/Computed vertex seed/);
 f=live();f.rows.find(r=>r.phase==='fixed-pixel-cache').key[0]^=1;
 assert.throws(()=>analyzeFixedPixel(f.rows),/Fixed pixel descriptor/);
 f=live();const selected=f.rows.find(r=>r.phase==='fixed-pixel-result'&&!r.miss).node;
 f.rows.find(r=>r.phase==='fixed-pixel-cache').nodes.find(n=>n.id===selected).program^=1;
 assert.throws(()=>analyzeFixedPixel(f.rows),/Derived pixel program key/);
 f=live();f.rows.splice(f.rows.findIndex(r=>r.phase==='fixed-vertex-input'),1);
 assert.throws(()=>analyzeFixedPixel(f.rows),/Missing vertex descriptor inputs/);
});
