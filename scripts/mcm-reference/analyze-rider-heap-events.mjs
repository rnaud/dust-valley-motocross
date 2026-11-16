import fs from 'node:fs';
import {createRiderHeapNeighborhood} from './world-rider-heap.mjs';
// Native allocation placement is an explicit external service here. Later
// rider headers are assertion targets only; this is not an autonomous heap.
export function analyzeRiderHeapEvents(initial,events,riders){
 const model=createRiderHeapNeighborhood(initial);let cursor=0,matched=0;const distinct=new Set();
 for(const r of riders.filter(r=>r.address===initial.child)){
  while(cursor<events.length&&events[cursor].frame<r.completedBikeFrames){
   const e=events[cursor++],p=e.phase==='malloc-result'?e.eax:e.phase==='free-call'?e.esi:0;
   if(e.phase==='malloc-result')model.malloc(p,e.esi);else if(e.phase==='free-call')model.free(p);
  }
  const actual=model.words();
  if(actual.some((v,i)=>v!==r.boundaryWords[i]))throw Error(`Rider heap mismatch at sequence ${r.sequence}: ${actual} != ${r.boundaryWords}`);
  distinct.add(actual.join(','));matched++;
 }
 return {matched,applied:model.updates,distinctHeaders:distinct.size,eventsConsumed:cursor,totalEvents:events.length,scope:'Ordinary neighborhood header updates with externally observed allocation placement; LFH groups are bounding opaque blocks'};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){
 const dir=process.argv[2],index=process.argv[3]??'1';
 const rows=name=>fs.readFileSync(`${dir}/${name}`,'utf8').trim().split('\n').map(JSON.parse);
 console.log(JSON.stringify(analyzeRiderHeapEvents(JSON.parse(fs.readFileSync(`${dir}/world-rider-heap-${index}.json`)),rows('terrain-allocation-events.jsonl'),rows('world-riders.jsonl')),null,2));
}
