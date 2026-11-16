import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {createWineOrdinaryHeap} from '../scripts/mcm-reference/wine-ordinary-heap.mjs';
import {createWineLfhRouting} from '../scripts/mcm-reference/wine-lfh-routing.mjs';
function fixture(name){const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));assert.equal(createHash('sha256').update(JSON.stringify(f.data)).digest('hex'),f.provenance.dataSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return f.data;}
test('ordinary heap chooses addresses and retains exact headers/lists through 1056 allocation/free steps',()=>{
 let count=0;for(const row of fixture('ordinary-heap')){const model=createWineOrdinaryHeap(row.initial);for(const step of row.steps){if(step.operation==='allocate')assert.equal(model.allocate(step.request),step.pointer);else model.free(step.pointer);assert.deepEqual(model.snapshot(),step.after);count++;}}assert.equal(count,1056);
});
test('LFH routing retains exact reserved/shared groups and slots through 504 native steps',()=>{
 let count=0;for(const row of fixture('lfh-routing')){const model=createWineLfhRouting(row.initial);for(const step of row.steps){if(step.operation==='allocate')assert.deepEqual(model.allocate(Math.ceil(row.request/16)*16,row.affinity),{pointer:step.pointer});else model.free(step.pointer);assert.deepEqual(model.snapshot(),step.after);count++;}}assert.equal(count,504);
});
test('unsupported ordinary requests and invalid frees leave initialized state intact',()=>{
 const model=createWineOrdinaryHeap(fixture('ordinary-heap')[0].initial),before=model.snapshot();
 assert.throws(()=>model.allocate(20),/Unsupported/);assert.throws(()=>model.free(123),/Uncaptured/);assert.deepEqual(model.snapshot(),before);
});
test('releasing an entire secondary region requires its external service before mutation',()=>{
 const rows=fixture('ordinary-heap');let found=false;
 for(const row of rows){const region=row.initial.regions.find(r=>r.address!==row.initial.heap+0x468&&r.blocks.filter(b=>!(b.words[1]>>>24&1)).length===1);if(!region)continue;
  const block=region.blocks.find(b=>!(b.words[1]>>>24&1)),model=createWineOrdinaryHeap(row.initial),before=model.snapshot();assert.throws(()=>model.free(block.header+8),/Region release service/);assert.deepEqual(model.snapshot(),before);found=true;break;
 }
 assert.ok(found);
});
