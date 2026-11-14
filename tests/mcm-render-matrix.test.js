import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeRenderMatrix} from '../scripts/mcm-reference/analyze-render-matrix.mjs';
const {rows}=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-matrix-stack-wine11.json.br',import.meta.url))));
test('native matrix-call capture narrows renderer scratch changes to the draw path',()=>{
 const r=analyzeRenderMatrix(rows);assert.equal(r.frames,20);
 assert.deepEqual(r.calls,{'0x004b7a00':80,'0x0044f870':80,'0x0047e8a0':80,'0x004465b0':40,'0x004206c0':80});
 assert.deepEqual(r.changedCalls,{'0x004465b0':40,'0x004206c0':20});
});
test('matrix capture rejects incomplete frames and invalid native stack cleanup',()=>{
 assert.throws(()=>analyzeRenderMatrix(rows.slice(0,-1)),/Incomplete/);
 const bad=structuredClone(rows);bad.find(r=>r.phase==='at-0044fb0c').esp-=4;
 assert.throws(()=>analyzeRenderMatrix(bad),/Invalid matrix return/);
});
