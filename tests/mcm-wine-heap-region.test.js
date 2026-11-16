import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createWineHeapRegion} from '../scripts/mcm-reference/wine-heap-region.mjs';
test('ordinary heap headers match 128 original-CRT/Wine free, merge and reuse sequences',()=>{
 const provenance=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/adjacent-heap-lifecycle-wine11.provenance.json',import.meta.url)));
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./fixtures/mcm/adjacent-heap-lifecycle-wine11.jsonl',import.meta.url))).digest('hex'),provenance.fixtureSha256);
 const rows=fs.readFileSync(new URL('./fixtures/mcm/adjacent-heap-lifecycle-wine11.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(rows.length,640);
 for(let id=0;id<128;id++){
  const samples=rows.slice(id*5,id*5+5),p=samples[0].pointer,size=2048+id*16,other=1024+(id%11)*16,regionOffset=samples[0].words[1]&65535;
  const region=createWineHeapRegion([{pointer:p-1560,bytes:1560},{pointer:p,bytes:size+8},{pointer:p+size+8,bytes:other+8},{pointer:p+size+other+16,bytes:1032}].map(b=>({...b,regionOffset,free:false})));
  samples.forEach((row,stage)=>{
   assert.equal(row.case,id);assert.equal(row.stage,stage);
   if(stage===1)region.free(p+size+8);
   if(stage===2||stage===4)region.free(p);
   if(stage===3)assert.equal(region.allocateAt(p,size-512),row.next);
   assert.deepEqual(region.words(p),row.words,`case ${id} stage ${stage}`);
  });
 }
});
