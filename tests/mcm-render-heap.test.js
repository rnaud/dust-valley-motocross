import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeRenderHeap} from '../scripts/mcm-reference/analyze-render-heap.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-heap-wine11.json.br',import.meta.url))));
test('native particle cleanup derives four heap writes and their next-frame carry',()=>{
 assert.deepEqual(analyzeRenderHeap(fixture),{stores:4,overlaps:4,carryChecks:1});
 assert.match(fixture.provenance.cleanup,/debugger=0 clean=1/);
});
test('heap audit rejects wrong sources, missing post-store observations and later overwrites',()=>{
 const copy=()=>structuredClone(fixture);
 let f=copy();f.heapHandle++;assert.throws(()=>analyzeRenderHeap(f),/Heap-handle source differs/);
 f=copy();f.render=f.render.filter(r=>r.phase!=='heap-504f3');assert.throws(()=>analyzeRenderHeap(f));
 f=copy();f.nextEntry.value=0;assert.throws(()=>analyzeRenderHeap(f),/did not survive/);
 f=copy();f.render.find(r=>r.phase==='state-1bd500').esp+=16;assert.throws(()=>analyzeRenderHeap(f),/stack address differs/);
});
