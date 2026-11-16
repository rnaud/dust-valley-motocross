import assert from 'node:assert/strict';
import {allocateMcmOwned,freeMcmOwned} from '../../src/physics/mcm/owned-allocation.js';
// Explicit CRT service boundary. Request order, owner counters and copied mesh
// bytes are computed. With retainedHeap, pointer and size observations only
// assert the connected allocator outputs; otherwise the legacy service is external.
export function connectTerrainAllocator(initial,buffers,nodes,eventText,runtime,heapObserver,retainedHeap){
 assert.equal(typeof eventText,'string','Missing terrain allocator events');
 const events=eventText.trim().split('\n').filter(Boolean).map(JSON.parse),allocations=new Map();
 for(const item of buffers.values())if(item.pointer){assert.ok(!allocations.has(item.pointer),'Shared terrain mesh allocation');allocations.set(item.pointer,Buffer.from(item.bytes));}
 const accounting={bytes:initial.accountingBytes};let cursor=0,frame=0,ownerAddress=0;const globalDifferences=[];
 const node=address=>{assert.ok(nodes.has(address),'Unknown allocator owner');const b=nodes.get(address);return new DataView(b.buffer,b.byteOffset,b.length);};
 const aiOwners=new Map();
 const owned=address=>({get bytes(){return aiOwners.has(address)?aiOwners.get(address).getUint32(0x40c,true):node(address).getUint32(8,true);},set bytes(v){if(aiOwners.has(address))aiOwners.get(address).setUint32(0x40c,v,true);else node(address).setUint32(8,v,true);}});
 const next=phase=>{
  const e=events[cursor++];assert.ok(e,'Missing terrain allocation event');assert.equal(e.phase,phase);assert.equal(e.frame,frame);assert.equal(e.owner,ownerAddress);assert.equal(e.ownerBytes,owned(ownerAddress).bytes,'Terrain owner accounting differs');
  if(e.globalBytes!==accounting.bytes)globalDifferences.push({frame,event:cursor-1,actual:accounting.bytes,expected:e.globalBytes});return e;
 };
 let sizePhase=0;
 const heap={
  malloc(size){const e=next('malloc-result');assert.equal(e.esi,size);const pointer=retainedHeap?retainedHeap.malloc(size):e.eax;assert.equal(pointer,e.eax,'Computed terrain allocation differs');if(pointer){assert.ok(!allocations.has(pointer),'Allocator reused live terrain pointer');allocations.set(pointer,Buffer.alloc(size));heapObserver?.malloc(pointer,size);}return pointer;},
  size(pointer){const e=next(sizePhase++?'size-owner':'size-global');assert.equal(e.esi,pointer);const bytes=retainedHeap?retainedHeap.size(pointer):e.eax;assert.equal(bytes,e.eax,'Computed heap size differs');return bytes;},
  free(pointer){const e=next('free-call');assert.equal(e.esi,pointer);if(pointer){assert.ok(allocations.has(pointer),'Free of uncaptured terrain allocation');allocations.delete(pointer);retainedHeap?.free(pointer);heapObserver?.free(pointer);}},
 };
 if(runtime&&events.some(e=>e.terrain===false)){
  for(const [address,bike]of runtime.bikes){
   if(!('aiController' in bike.loaded.context))continue;const controller=bike.loaded.context.aiController;
   const owner=address+0x404,environment=controller.environment,aiBlocks=new Map();aiOwners.set(owner,controller.body);
   assert.equal(environment.accounting.bytes,accounting.bytes,'Shared accounting initialization differs');environment.accounting=accounting;
   environment.heap={
    calloc(count,size){ownerAddress=owner;const e=next('calloc-entry');assert.equal(e.argument,count);assert.equal(e.argument2,size);assert.ok([0x46e07a,0x46e1e2].includes(e.caller));
     const r=next('calloc-result');assert.equal(r.esi,size);const pointer=retainedHeap?retainedHeap.calloc(count,size):r.eax;assert.equal(pointer,r.eax,'Computed AI allocation differs');if(pointer){assert.ok(!aiBlocks.has(pointer));aiBlocks.set(pointer,Math.max(16,Math.ceil(count*size/16)*16));}return pointer;
    },
    size(pointer){ownerAddress=owner;if(events[cursor]?.phase==='free-entry'){const e=next('free-entry');assert.equal(e.argument,pointer);assert.ok([0x46e9d7,0x46e9eb].includes(e.caller));sizePhase=0;}
     const e=next(sizePhase++?'size-owner':'size-global');assert.equal(e.esi,pointer);const bytes=retainedHeap?retainedHeap.size(pointer):aiBlocks.get(pointer);assert.equal(e.eax,bytes,'AI heap size policy differs');return bytes;
    },
    free(pointer){ownerAddress=owner;if(!pointer){const e=next('free-entry');assert.equal(e.argument,0);}const e=next('free-call');assert.equal(e.esi,pointer);if(pointer){assert.ok(aiBlocks.delete(pointer));retainedHeap?.free(pointer);}},
   };
  }
 }
 return{allocations,accounting,globalDifferences,
  beginFrame(value){frame=value;},
  malloc(address,size){ownerAddress=address;const e=next('malloc-entry');assert.equal(e.argument,size);return allocateMcmOwned(owned(address),accounting,heap,size);},
  free(address,pointer){ownerAddress=address;const e=next('free-entry');assert.equal(e.argument,pointer);sizePhase=0;freeMcmOwned(owned(address),accounting,heap,pointer);},
  copy(pointer,source,size){const target=allocations.get(pointer);assert.ok(target,'Copy to uncaptured terrain allocation');assert.ok(size<=target.length&&size<=source.length,'Terrain mesh copy exceeds allocation');target.set(source.subarray(0,size));},
  finishFrame(){assert.ok(!events[cursor]||events[cursor].frame>frame,'Unconsumed terrain allocation events');},
  get remaining(){return events.length-cursor;},
 };
}
