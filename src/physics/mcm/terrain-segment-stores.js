import {queryMcmTerrainSegment} from './terrain-segment.js';
import {splitMcmTerrainSegment,traverseMcmTerrainSegment} from './terrain-segment-traversal.js';
import {floatBits} from './math.js';

// 0x48e4c0 reserves 0x4f4 bytes and saves four registers. Its merged
// crossing array starts at body ESP+0x36c. The 0x40ded0 constructors do
// not initialize memory: unused slots must retain earlier stack contents.
// This models the completed merged array only, not every local/call store.
export function mcmTerrainMergedPointStores({entryEsp,start,end,shift}){
 const {points}=splitMcmTerrainSegment(start,end,shift);
 return mergedStores(entryEsp,points);
}

function mergedStores(entryEsp,points){
 const base=(entryEsp-0x504+0x36c)>>>0;
 return points.flatMap((point,index)=>point.map((value,axis)=>({
  address:(base+index*12+axis*4)>>>0,value:floatBits(value),
 })));
}

// The wrapper calls the root traversal at ESP-0x68. Each recursive call
// saves/reserves 0x504 bytes and pushes four arguments plus its return address.
// Terrain selection, clipping, visit order and depth come from the recovered
// query; no observed child inputs or output points drive these stores.
export function mcmTerrainQueryMergedStores({terrain,entryEsp,start,end}){
 const visits=[],output=[0,0,0];
 const onSplit=({node,start,end,points,depth})=>{
  const esp=(entryEsp-0x68-depth*0x518)>>>0;
  visits.push({entryEsp:esp,depth,nodeOffset:node.offset,level:node.level,shift:node.shift,
   start:start.map(floatBits),end:end.map(floatBits),stores:mergedStores(esp,points)});
 };
 const result=queryMcmTerrainSegment(terrain,start,end,output,null,
  (node,a,b,out,option)=>traverseMcmTerrainSegment(node,a,b,out,option,onSplit));
 return {result,output,visits};
}
