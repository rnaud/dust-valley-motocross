import assert from 'node:assert/strict';
import {mcmRenderHeapStore} from '../../src/physics/mcm/render-heap.js';

// Observation audit for the synchronous upload-cleanup path. Upload eligibility
// and the camera/particle world are observed boundaries, not reconstructed here.
export function analyzeRenderHeap({heapHandle,render,nextEntry}){
 let apply=null,pending=null,source=null,stores=0,overlaps=0,last=null,draw=false;
 for(const r of render){
  if(r.phase==='particle-before-draw'){assert.equal(draw,false);draw=true;}
  if(r.phase==='state-1bd500'){assert.ok(draw);apply=r;}
  if(r.phase==='heap-504f0'){
   assert.ok(draw&&apply);assert.equal(pending,null);pending=r;source=null;
  }
  if(r.phase==='heap-store-source'){
   assert.ok(pending);assert.equal(source,null);assert.equal(r.frame,pending.frame);assert.equal(r.frame,apply.frame);source=r;
   const expected=mcmRenderHeapStore(apply.esp,heapHandle);
   assert.equal(r.address,expected.address,'Derived cleanup stack address differs');
   assert.equal(r.value,expected.value,'Heap-handle source differs');
   assert.equal(pending.result,expected.value,'Instruction EAX differs');
  }
  if(r.phase==='heap-504f3'){
   assert.ok(pending&&source);assert.equal(r.frame,pending.frame);
   assert.equal(r.scratch,pending.scratch);stores++;
   if(source.address===r.scratch){assert.equal(r.value,source.value,'Actual heap store differs');overlaps++;last=r;}
   pending=null;source=null;
  }
  if(r.phase==='particle-draw-return'){assert.ok(draw);assert.equal(pending,null);assert.ok(last);assert.equal(r.value,last.value);draw=false;}
 }
 assert.equal(draw,false);assert.equal(pending,null);assert.ok(stores>0&&overlaps>0);
 assert.equal(nextEntry.frame,last.frame+1);assert.equal(nextEntry.scratch,last.scratch);
 assert.equal(nextEntry.value,last.value,'Heap store did not survive to next bike update');
 return {stores,overlaps,carryChecks:1};
}
