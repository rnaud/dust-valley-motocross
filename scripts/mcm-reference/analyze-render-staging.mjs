import assert from 'node:assert/strict';
import {mcmRenderTemporaryStage,mcmRenderTemporaryUnmap} from '../../src/physics/mcm/render-staging.js';
import {mcmRenderUpdateCommand,mcmRenderCommandFree} from '../../src/physics/mcm/render-command.js';
import {mcmRenderHeapStore} from '../../src/physics/mcm/render-heap.js';
export function analyzeRenderStaging(cases,heapHandle){
 let bytes=0;assert.ok(cases.length);
 for(const c of cases){
  const {input,map,unmap,producer,command}=c;
  assert.equal(input.mapTarget,0x7a770000+0x1b6840);assert.equal(input.unmapTarget,0x7a770000+0x1b7ab0);
  for(const r of [map,unmap,producer,command])assert.equal(r.frame,input.frame);
  assert.equal(map.resource,input.resource);assert.equal(unmap.resource,input.resource);
  assert.equal(map.result,1,'Live fixture covers successful allocations only');
  // The heap allocation pointer is the environment boundary. Everything stored
  // alongside it, including pitches, flags and box, is computed from entry data.
  const stage=mcmRenderTemporaryStage({format:input.format,box:input.box,mapFlags:0x40000000,
   allocationPointer:map.mapped[2],previousState:Array(9).fill(0)});
  assert.equal(stage.success,true);assert.deepEqual(stage.mapped,map.mapped);
  assert.deepEqual(stage.state,map.state);bytes+=stage.size;
  const result=mcmRenderTemporaryUnmap(stage.state);
  assert.equal(unmap.result,1);assert.deepEqual(result.upload,unmap.upload);
  assert.deepEqual(result.box,unmap.box);assert.deepEqual(result.state,unmap.state);
  const args={resource:input.resource,subresource:input.subresource,box:result.box,
   upload:result.upload,rowPitch:stage.rowPitch,slicePitch:stage.slicePitch};
  for(const key of Object.keys(args))assert.deepEqual(producer[key],args[key],`Producer ${key} differs`);
  assert.deepEqual([...mcmRenderUpdateCommand(args)],command.words);
  assert.equal(mcmRenderCommandFree(mcmRenderUpdateCommand(args)).pointer,map.mapped[2]);
  assert.equal(c.frees.length,1);assert.equal(c.frees[0].frame,input.frame);
  assert.equal(c.stores.length,1);
  assert.equal(c.apply.frame,input.frame);
  const predicted=mcmRenderHeapStore(c.apply.esp,heapHandle);
  assert.equal(c.stores[0].frame,input.frame);
  assert.equal(c.stores[0].address,predicted.address);
  assert.equal(c.stores[0].value,predicted.value);
 }
 return {uploads:cases.length,allocatedBytes:bytes,commands:cases.length,frees:cases.length,heapStores:cases.length};
}
