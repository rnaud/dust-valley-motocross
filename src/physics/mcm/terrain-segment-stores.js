import {splitMcmTerrainSegment} from './terrain-segment-traversal.js';
import {floatBits} from './math.js';

// 0x48e4c0 reserves 0x4f4 bytes and saves four registers. Its merged
// crossing array starts at body ESP+0x36c. The 0x40ded0 constructors do
// not initialize memory: unused slots must retain earlier stack contents.
// This models the completed merged array only, not every local/call store.
export function mcmTerrainMergedPointStores({entryEsp,start,end,shift}){
 const {points}=splitMcmTerrainSegment(start,end,shift);
 const base=(entryEsp-0x504+0x36c)>>>0;
 return points.flatMap((point,index)=>point.map((value,axis)=>({
  address:(base+index*12+axis*4)>>>0,value:floatBits(value),
 })));
}
