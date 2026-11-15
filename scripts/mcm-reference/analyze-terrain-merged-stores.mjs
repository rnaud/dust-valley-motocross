import assert from 'node:assert/strict';
import {mcmTerrainQueryMergedStores} from '../../src/physics/mcm/terrain-segment-stores.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export const terrainMergedPhases=new Set(['terrain-query-input','terrain-merged-points']);
const floats=words=>Array.from(new Float32Array(Uint32Array.from(words).buffer));

// Only the top-level query is an invocation input. Child coordinates, levels,
// shifts, visit order and stack depths are computed from the original map.
// Native child entries and merged points are assertions, never replay state.
export function analyzeTerrainMergedStores(rows,{terrain=null}={}){
 const stores=new Map(),nodeAddresses=new Map(),addressNodes=new Map();
 let query=null,entry=null,calls=0,words=0,queries=0;
 const finish=()=>{if(query){assert.equal(entry,null,'Incomplete terrain split');assert.equal(query.index,query.visits.length,'Missing computed terrain visits');}};
 for(const [index,r] of rows.entries()){
  if(r.phase==='terrain-query-input'&&r.entry===0x410ac0){
   finish();assert.ok(terrain,'Missing original terrain for query replay');
   assert.equal(r.start.length,3);assert.equal(r.end.length,3);
   assert.equal(r.scale,floatBits(terrain.heightScale),'Terrain height scale');
   const computed=mcmTerrainQueryMergedStores({terrain,entryEsp:r.esp,start:floats(r.start),end:floats(r.end)});
   query={...computed,frame:r.frame,root:r.root,index:0};queries++;
  }
  if(r.phase==='terrain-query-input'&&r.entry===0x48e4c0){
   assert.ok(query,'Missing top-level terrain query');assert.equal(entry,null,'Unfinished terrain split');
   const expected=query.visits[query.index];assert.ok(expected,'Unexpected terrain visit');
   assert.equal(r.frame,query.frame);assert.equal(r.esp,expected.entryEsp,'Derived recursive stack');
   assert.deepEqual(r.start,expected.start,'Derived recursive start');assert.deepEqual(r.end,expected.end,'Derived recursive end');
   if(expected.depth===0)assert.equal(r.object,query.root,'Terrain root address');
   if(nodeAddresses.has(expected.nodeOffset))assert.equal(r.object,nodeAddresses.get(expected.nodeOffset),'Retained terrain node address');
   else{assert.ok(!addressNodes.has(r.object),'Aliased terrain node address');nodeAddresses.set(expected.nodeOffset,r.object);addressNodes.set(r.object,expected.nodeOffset);}
   entry=r;
  }
  if(r.phase==='terrain-merged-points'){
   assert.ok(entry,'Missing terrain split inputs');
   const expected=query.visits[query.index],computed=expected.stores;
   assert.equal(r.frame,query.frame);assert.equal(r.esp,expected.entryEsp-0x504,'Derived traversal body stack');
   assert.equal(r.node,entry.object);assert.equal(r.level,expected.level,'Derived terrain level');assert.equal(r.shift&255,expected.shift,'Derived terrain shift');
   assert.equal(computed.length,r.count*3);
   assert.deepEqual(computed.map(s=>s.value),r.points,'Computed terrain merged points');
   stores.set(index,computed);query.index++;entry=null;calls++;words+=computed.length;
  }
 }
 finish();return {queries,calls,words,stores};
}
