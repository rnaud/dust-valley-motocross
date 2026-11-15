import assert from 'node:assert/strict';
import {allocateMcmOwnedArray,freeMcmOwned} from '../../src/physics/mcm/owned-allocation.js';
// Pointer identity and initial per-call global accounting are environment inputs.
// Block sizes are computed over the native-oracle-validated bounded domain.
export function analyzeAiAllocations(rows){
 const owner={bytes:0},blocks=new Map();let initialized=false,allocations=0,frees=0,calls=0,skipped=0;
 for(const before of rows.filter(r=>r.phase==='before')){
  const at=phase=>rows.find(r=>r.sequence===before.sequence&&r.phase===phase),after=at('after');
  assert.ok(after,'Missing allocation controller exit');assert.equal(after.bike,before.bike);
  const b=Buffer.from(before.hex,'hex'),end=Buffer.from(after.hex,'hex');
  if(!initialized){owner.bytes=b.readUInt32LE(0x40c);initialized=true;}
  assert.equal(owner.bytes,b.readUInt32LE(0x40c),'Retained allocation entry');
  const events=rows.filter(r=>r.sequence===before.sequence&&r.phase==='allocation-event');
  if(b.readUInt32LE(0x4bc)){assert.equal(events.length,0,'Skipped allocation events');skipped++;}
  else{
   assert.equal(events.length,10,'Complete successful allocation lifecycle required');
   const first=at('actors'),second=at('second-actors');assert.ok(first&&second,'Missing allocation actor counts');
   const accounting={bytes:events[0].globalBytes};
   const check=e=>{assert.equal(e.bike,before.bike);assert.equal(e.owner,before.bike+0x404);assert.equal(e.ownerBytes,owner.bytes,'Computed owner accounting');assert.equal(e.globalBytes,accounting.bytes,'Computed global accounting');};
   for(let i=0;i<2;i++){
    const e=events[i*2],exit=events[i*2+1];assert.equal(e.instruction,0x45c8d0);assert.equal(exit.instruction,0x45c8f3);check(e);
    assert.equal(e.count,(i?second:first).actors.length);assert.equal(e.size,20);
    assert.ok(e.count<=8,'Unvalidated allocation size domain');assert.ok(exit.eax,'Allocation failure requires early-return replay');assert.ok(!blocks.has(exit.eax),'Allocation address still live');
    const pointer=allocateMcmOwnedArray(owner,accounting,{calloc:(count,size)=>{blocks.set(exit.eax,Math.max(16,Math.ceil(count*size/16)*16));return exit.eax;}},e.count,e.size);
    assert.equal(pointer,exit.eax);check(exit);allocations++;
   }
   for(let i=0;i<2;i++){
    const e=events[4+i*3],middle=events[5+i*3],exit=events[6+i*3];
    assert.equal(e.instruction,0x45c832);assert.equal(middle.instruction,0x45c849);assert.equal(exit.instruction,0x45c854);
    const pointer=events[i*2+1].eax;assert.equal(e.esi,pointer);assert.equal(middle.esi,pointer);assert.equal(exit.esi,pointer);let lookup=0;
    freeMcmOwned(owner,accounting,{size:p=>{const event=lookup++?middle:e;check(event);assert.ok(blocks.has(p),'Free of unknown block');const size=blocks.get(p);assert.equal(event.eax,size,'Computed original CRT size');return size;},free:p=>{check(exit);blocks.delete(p);}},pointer);frees++;
   }
  }
  assert.equal(owner.bytes,end.readUInt32LE(0x40c),'Computed allocation controller exit');calls++;
 }
 assert.equal(blocks.size,0);assert.equal(rows.filter(r=>r.phase==='allocation-event').length,allocations*2+frees*3,'Unmatched allocation events');
 return {calls,allocations,frees,skipped,finalOwnerBytes:owner.bytes};
}
