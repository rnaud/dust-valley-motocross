import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createCrtSmallPage} from '../scripts/mcm-reference/crt-small-page.mjs';
function fixture(name){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
 assert.equal(createHash('sha256').update(JSON.stringify(f.data)).digest('hex'),f.provenance.dataSha256);
 assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 return f.data;
}
test('CRT page placement and fragmentation match 16384 original transitions',()=>{
 let steps=0,failures=0;
 for(const row of fixture('crt-small-page')){
  const model=createCrtSmallPage(row.initial);
  for(const [index,step] of row.steps.entries()){
   const context=`case ${row.case} step ${index}`;
   if(step.operation==='allocate'){
    const pointer=model.allocate(step.units);assert.equal(pointer??0,step.pointer,context);failures+=pointer===null;
   }else model.free(step.pointer);
   assert.deepEqual(model.snapshot(),step.after,context);steps++;
  }
 }
 assert.equal(steps,16384);assert.equal(failures,3787);
});
test('live CRT snapshot contains every committed page and consistent region metadata',()=>{
 const heap=fixture('crt-small-heap'),regions=new Map(heap.regions.map(r=>[r.address,r]));
 assert.equal(heap.threshold,480);assert.ok(regions.has(heap.currentRegion));
 let address=heap.head,pages=0;
 const seen=new Set();
 do{
  assert.ok(!seen.has(address));seen.add(address);
  const region=regions.get(address),bytes=Buffer.from(region.hex,'hex');assert.equal(bytes.length,0x814);
  assert.equal(Buffer.from(regions.get(bytes.readUInt32LE(0)).hex,'hex').readUInt32LE(4),address);
  const base=bytes.readUInt32LE(0x810),captured=new Map(region.pages.map(p=>[p.address,p]));
  for(let i=0;i<1024;i++){
   const p=captured.get(base+i*4096),free=bytes[16+i];
   if(free===255){assert.equal(p,undefined);continue;}
   assert.ok(p);assert.equal(p.freeUnits,free);assert.deepEqual(createCrtSmallPage(p).snapshot(),p);pages++;
  }
  assert.equal(captured.size,region.pages.length);address=bytes.readUInt32LE(0);
 }while(address!==heap.head);
 assert.equal(seen.size,regions.size);assert.equal(pages,880);
 // This is a historical counter, not the present number of empty pages.
 assert.equal(heap.freePageCounter,30);
});
test('CRT page rejects incomplete metadata and freeing inside an allocation',()=>{
 const initial=fixture('crt-small-page')[0].initial,model=createCrtSmallPage(initial),pointer=model.allocate(3);
 assert.throws(()=>model.free(pointer+16),/Invalid CRT free/);
 model.free(pointer);assert.throws(()=>model.free(pointer),/Invalid CRT free/);
 assert.throws(()=>createCrtSmallPage({...initial,freeUnits:239}),/free-unit count/);
 assert.throws(()=>createCrtSmallPage({...initial,hex:initial.hex.slice(2)}),/Invalid CRT page/);
});
