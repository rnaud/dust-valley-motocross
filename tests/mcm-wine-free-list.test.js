import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {createWineFreeList} from '../scripts/mcm-reference/wine-free-list.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/heap-placement-wine11.json.br',import.meta.url))));
test('ordinary allocation chooses original addresses and reproduces every resulting free-list word/link',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(fixture.rows)).digest('hex'),fixture.provenance.rowsSha256);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 let existing=0,growth=0;
 for(const row of fixture.rows){
  const model=createWineFreeList(row.freeList),result=model.allocate(row.request);
  if(result===null){
   assert.ok(!row.freeList.entries.some(e=>e.words[1]>>>24===1&&row.pointer>=e.header+8&&row.pointer<e.header+e.words[0]*8));
   assert.deepEqual(model.snapshot(),row.freeList,'Region growth must not mutate the existing list');growth++;continue;
  }
  assert.deepEqual(result,{pointer:row.pointer,words:row.words});
  assert.deepEqual(model.snapshot(),row.afterFreeList,`case ${row.case}`);existing++;
 }
 assert.equal(existing,394);assert.equal(growth,118);
});
test('missing links and unsupported allocation paths cannot silently choose a pointer',()=>{
 const s=structuredClone(fixture.rows[0].freeList);s.entries[0].links[0]=123;assert.throws(()=>createWineFreeList(s),/Broken/);
 const model=createWineFreeList(fixture.rows[0].freeList),before=model.snapshot();
 for(const request of [0,20,1023,NaN,0x80000])assert.throws(()=>model.allocate(request),/Unsupported/);
 assert.deepEqual(model.snapshot(),before);
});
