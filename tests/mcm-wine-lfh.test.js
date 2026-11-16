import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {createWineLfhGroup} from '../scripts/mcm-reference/wine-lfh-group.mjs';
import {loadWineHeap} from '../scripts/mcm-reference/load-wine-heap.mjs';
function fixture(name){const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));assert.equal(createHash('sha256').update(JSON.stringify(f.data)).digest('hex'),f.provenance.dataSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return f.data;}
test('LFH groups match 1952 original allocation/free states without later state inputs',()=>{
 const rows=fixture('lfh-group');let steps=0,released=0;
 for(const row of rows){const model=createWineLfhGroup(row.initial);
  for(const step of row.steps){
   if(step.operation==='allocate')assert.equal(model.allocate(Math.ceil(row.request/16)*16,row.initial.affinity),step.pointer);
   else released+=model.free(step.pointer).released;
   assert.deepEqual(model.snapshot(),step.after);steps++;
  }
 }
 assert.equal(rows.length,32);assert.equal(steps,1952);assert.equal(released,32);
});
test('live ordinary regions, free lists and LFH routing roots form a complete metadata graph',()=>{
 const data=fixture('heap-regions');assert.deepEqual(loadWineHeap(data).report,{regions:5,blocks:2547,groups:543,slots:16833,freeBlocks:251,reservedGroups:18});
 const broken=structuredClone(data);broken.regions[0].blocks.splice(3,1);assert.throws(()=>loadWineHeap(broken),/Missing or reordered/);
 const missing=structuredClone(data);delete missing.regions.flatMap(r=>r.blocks).find(b=>b.lfh).lfh;assert.throws(()=>loadWineHeap(missing),/Missing LFH/);
});
test('a full LFH group remains unavailable until its last used slot is freed',()=>{
 const row=fixture('lfh-group')[0],model=createWineLfhGroup(row.steps[29].after);
 assert.equal(model.allocate(16,row.initial.affinity),null);
 const pointer=row.steps[30].pointer;assert.deepEqual(model.free(pointer),{released:false});assert.equal(model.allocate(16,row.initial.affinity),null);
 assert.throws(()=>model.free(pointer),/double free/);
});
