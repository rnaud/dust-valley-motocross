import {createCrtVirtualMemory} from './crt-virtual-memory.mjs';
import {createCrtSmallHeap} from './crt-small-heap.mjs';
import {createWineOrdinaryHeap} from './wine-ordinary-heap.mjs';
import {createWineLfhRouting} from './wine-lfh-routing.mjs';
// One atomic initial state; later allocator observations are assertions only.
// Missing virtual-memory services throw rather than choosing an address.
export function createWorldHeapRuntime(files,services={}){
 const initial=JSON.parse(files['world-rider-heap-0.json']),thread=JSON.parse(files['world-heap-thread.json']);
 const entry=JSON.parse(files['world-entry.json']);if(thread.captureId!==entry.captureId)throw Error('Heap thread capture differs from world checkpoint');
 const affinity=thread.heapVirtualAffinity;if(!Number.isInteger(affinity)||affinity<1||affinity>31)throw Error('Uninitialized allocator thread affinity');
 const ordinary=createWineOrdinaryHeap(initial),routing=createWineLfhRouting(initial,{createGroup:stride=>ordinary.allocateGroup(stride),releaseGroup:p=>ordinary.freeGroup(p)});
 let allocations=0,frees=0,sizeQueries=0;
 function wineAllocate(size){
  const result=routing.allocate(size,affinity);if('pointer'in result)return result.pointer;
  if(result.service!=='ordinary')throw Error('Missing LFH group service');
  const pointer=ordinary.allocate(size,{raw:true});if(pointer===null)throw Error('Wine region growth service required');
  routing.recordOrdinaryAllocation((ordinary.words(pointer)[0]&65535)*8);return pointer;
 }
 function wineFree(pointer){
  if(routing.owns(pointer)){routing.free(pointer);return;}
  const bytes=(ordinary.words(pointer)[0]&65535)*8;ordinary.free(pointer);routing.recordOrdinaryFree(bytes);
 }
 const vm=createCrtVirtualMemory(initial.crtSmallHeap);
 const crt=createCrtSmallHeap(initial.crtSmallHeap,{...vm,...services,allocateRegion:wineAllocate,freeRegion:wineFree});
 const riderHeaders=new Map([0,1].map(i=>{const h=i===0?initial:JSON.parse(files[`world-rider-heap-${i}.json`]);return [h.child,h.anchor+8];}));
 const api={
  malloc(size){
   if(!Number.isInteger(size)||size<0||size>0xffffffe0)throw Error('Invalid CRT allocation request');
   const rounded=Math.ceil(Math.max(1,size)/16)*16;let pointer=null;
   if(rounded<=initial.crtSmallHeap.threshold)pointer=crt.allocate(rounded/16);
   if(pointer===null)pointer=wineAllocate(rounded);allocations++;return pointer;
  },
  calloc(count,size){const total=count*size;if(!Number.isInteger(count)||!Number.isInteger(size)||count<0||size<0||total>0xffffffe0)throw Error('Invalid CRT calloc request');return api.malloc(total);},
  size(pointer){sizeQueries++;if(crt.owns(pointer))return crt.size(pointer);if(routing.owns(pointer))return routing.size(pointer);
   const w=ordinary.words(pointer);if(w[1]>>>24&1)throw Error('Size of free ordinary block');return (w[0]&65535)*8-8-(w[0]>>>16);
  },
  free(pointer){if(!pointer)return;if(crt.owns(pointer))crt.free(pointer);else wineFree(pointer);frees++;},
  words(child){const pointer=riderHeaders.get(child);if(!pointer)throw Error('Uncaptured rider heap');return ordinary.words(pointer);},
  report(){return {allocations,frees,sizeQueries,affinity,virtualMemory:vm.report()};},
  snapshot(){return {ordinary:ordinary.snapshot(),lfh:routing.snapshot(),bins:routing.binCounters(),crt:crt.snapshot()};},
 };
 return api;
}
