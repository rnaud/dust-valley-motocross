import assert from 'node:assert/strict';
import {mcmTerrainMergedPointStores} from '../../src/physics/mcm/terrain-segment-stores.js';
export const terrainMergedPhases=new Set(['terrain-query-input','terrain-merged-points']);
const floats=words=>Array.from(new Float32Array(Uint32Array.from(words).buffer));

// Recursive invocation inputs and node metadata remain explicit boundaries.
// Native merged points are assertions; they never supply computed stores.
export function analyzeTerrainMergedStores(rows){
 const pending=new Map(),stores=new Map();let calls=0,words=0;
 for(const [index,r] of rows.entries()){
  if(r.phase==='terrain-query-input'&&r.entry===0x48e4c0){
   assert.ok(!pending.has(r.esp),'Unfinished terrain split');
   assert.equal(r.start.length,3);assert.equal(r.end.length,3);
   pending.set(r.esp,r);
  }
  if(r.phase==='terrain-merged-points'){
   const entryEsp=r.esp+0x504,input=pending.get(entryEsp);
   assert.ok(input,'Missing terrain split inputs');
   assert.equal(input.frame,r.frame);assert.equal(input.object,r.node);
   const computed=mcmTerrainMergedPointStores({entryEsp,start:floats(input.start),end:floats(input.end),shift:r.shift&255});
   assert.equal(computed.length,r.count*3);
   assert.deepEqual(computed.map(s=>s.value),r.points,'Computed terrain merged points');
   stores.set(index,computed);pending.delete(entryEsp);calls++;words+=computed.length;
  }
 }
 assert.equal(pending.size,0,'Incomplete terrain split');
 return {calls,words,stores};
}
