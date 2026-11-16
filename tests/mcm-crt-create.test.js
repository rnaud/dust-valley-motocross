import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {createCrtSmallHeap} from '../scripts/mcm-reference/crt-small-heap.mjs';
import {createWineOrdinaryHeap} from '../scripts/mcm-reference/wine-ordinary-heap.mjs';
function fixture(name){const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));assert.equal(createHash('sha256').update(JSON.stringify(f.data)).digest('hex'),f.provenance.dataSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return f.data;}
test('CRT first/additional region creation and failure cleanup match the original',()=>{
 let total=0;const counts={};
 for(const row of fixture('crt-small-create')){
  let expected=[];
  const services=Object.fromEntries(['allocateRegion','reserve','commit','release','freeRegion'].map(name=>[name,(a,b)=>{
   const call=expected.shift();assert.ok(call);assert.equal(call.operation,name);counts[name]=(counts[name]||0)+1;
   if(name==='allocateRegion'||name==='reserve')assert.equal(a,call.size);
   else {assert.equal(a,call.address);assert.equal(b??0,call.size);}
   return call.result??call.ok;
  }]));
  const model=createCrtSmallHeap(row.initial,services);
  for(const step of row.steps){expected=[...step.services];assert.equal(model.allocate(step.units)??0,step.result);assert.equal(expected.length,0);assert.deepEqual(model.snapshot(),step.after);total++;}
 }
 assert.equal(total,16);assert.deepEqual(counts,{reserve:14,commit:10,allocateRegion:8,freeRegion:4,release:4});
});
test('raw Wine requests retain exact placement and headers across 1056 operations',()=>{
 let count=0;
 for(const row of fixture('ordinary-raw-heap')){
  const model=createWineOrdinaryHeap(row.initial);
  for(const s of row.steps){
   if(s.operation==='allocate')assert.equal(model.allocate(s.request,{raw:true}),s.pointer);else model.free(s.pointer);
   assert.deepEqual(model.snapshot(),s.after);count++;
  }
 }
 assert.equal(count,1056);
});
test('coupled CRT region creation computes metadata placement through the retained Wine heap',()=>{
 const rows=fixture('crt-wine-create');let computed=0;
 for(const row of rows){
  let expected=[];const wine=createWineOrdinaryHeap(row.initial.wine);
  const check=(name,address,size)=>{const c=expected.shift();assert.ok(c);assert.equal(c.operation,name);assert.equal(c.address,address);assert.equal(c.size,size);return c;};
  const crt=createCrtSmallHeap(row.initial.crt,{
   allocateRegion(size){const pointer=wine.allocate(size,{raw:true});assert.equal(pointer,check('allocateRegion',0,size).result);computed++;return pointer;},
   freeRegion(address){wine.free(address);check('freeRegion',address,0);return true;},
   reserve(size){return check('reserve',0,size).result;},commit(address,size){return check('commit',address,size).ok;},release(address){return check('release',address,0).ok;},
  });
  for(const s of row.steps){expected=[...s.services];assert.equal(crt.allocate(s.units)??0,s.result);assert.equal(expected.length,0);assert.deepEqual(crt.snapshot(),s.after.crt);assert.deepEqual(wine.snapshot(),s.after.wine);}
 }
 assert.equal(rows.length,4);assert.equal(computed,2);
});
