import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {analyzeStateblockProduct} from '../scripts/mcm-reference/analyze-stateblock-product.mjs';
const rows=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/stateblock-product-wine11.json.br',import.meta.url))));
test('Wine render product matches native matrix words and the overlapping scratch store',()=>{
 assert.deepEqual(analyzeStateblockProduct(rows),{calls:30,words:480,differences:0,overlappingStores:9,retainedAtDrawReturn:9,finalWords:[0x3f5fd1d3,0x3f5fd1d1]});
});
test('matrix evidence rejects missing boundaries and modified inputs or retained outputs',()=>{
 assert.throws(()=>analyzeStateblockProduct(rows.filter(r=>r.phase!=='store-after')),/Missing store completion/);
 const changed=structuredClone(rows);changed.find(r=>r.phase==='store-after').scratchBits^=1;
 assert.throws(()=>analyzeStateblockProduct(changed),/Store does not match/);
 const input=structuredClone(rows);const start=input.findIndex(r=>r.phase==='product-store'&&r.overlapsScratch);
 const before=input.slice(0,start).findLast(r=>r.phase==='before-product');before.words[2]=0;
 assert.throws(()=>analyzeStateblockProduct(input),/Store does not match/);
 const later=structuredClone(rows);const store=later.findIndex(r=>r.phase==='store-after');later.slice(store).find(r=>r.phase==='at-00445f88').scratchBits=0;
 assert.throws(()=>analyzeStateblockProduct(later),/Later draw write/);
 assert.throws(()=>analyzeStateblockProduct(rows.slice(0,rows.findLastIndex(r=>r.phase==='at-00445f88'))),/Incomplete capture/);
});
