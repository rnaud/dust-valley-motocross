import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {createWineOrdinaryHeap} from '../scripts/mcm-reference/wine-ordinary-heap.mjs';
import {createWineLfhRouting,wineLfhBin,wineLfhStride} from '../scripts/mcm-reference/wine-lfh-routing.mjs';
test('LFH creation and excess-group release retain native ordinary and group state',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/lfh-create-release-wine11.json.br',import.meta.url))));
 assert.equal(createHash('sha256').update(JSON.stringify(fixture.data)).digest('hex'),fixture.provenance.dataSha256);assert.equal(fixture.provenance.runtime,'wine-11.0-x86');
 let allocations=0,frees=0,created=0,released=0;
 for(const row of fixture.data){
  const ordinary=createWineOrdinaryHeap(row.initial),lfh=createWineLfhRouting(row.initial,{createGroup(stride){created++;return ordinary.allocateGroup(stride);},releaseGroup(pointer){released++;ordinary.freeGroup(pointer);}});
  for(const step of row.steps){
   for(const pointer of step.pointers){
    if(step.operation==='allocate-group'){assert.deepEqual(lfh.allocate(row.request,step.affinity),{pointer});allocations++;}
    else {lfh.free(pointer);frees++;}
   }
   assert.deepEqual(ordinary.snapshot(),step.after.ordinary);assert.deepEqual(lfh.snapshot(),step.after.lfh);
  }
 }
 assert.deepEqual({allocations,frees,created,released},{allocations:8928,frees:8928,created:288,released:16});
});
test('LFH bin sizes map back to the same class at each boundary',()=>{
 for(let i=0;i<128;i++){const stride=wineLfhStride(i);assert.equal(wineLfhBin(stride),i);if(i)assert.equal(wineLfhBin(wineLfhStride(i-1)+1),i);}
 assert.throws(()=>wineLfhStride(128),/Invalid LFH bin/);
});
