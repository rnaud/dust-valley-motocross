import assert from 'node:assert/strict';
import {findMcmNearestAiRoute} from '../../src/physics/mcm/ai-route-nearest.js';
import {advanceMcmAiRouteTarget} from '../../src/physics/mcm/ai-route-target.js';
const float=w=>new Float32Array(Uint32Array.of(w).buffer)[0],bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function analyzeAiRouteTargets(rows){
 const route=rows.find(r=>r.phase==='route');assert.ok(route,'Missing AI route');
 const nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),y:float(n.words[1]),z:float(n.words[2]),next:n.words[10]}])),table=route.nodes.map(n=>n.address);
 let retained=null,calls=0,advances=0;const checks=[];
 for(const entry of rows.filter(r=>r.phase==='before')){
  const b=Buffer.from(entry.hex,'hex'),observed=rows.find(r=>r.phase==='target'&&r.sequence===entry.sequence),ctx=rows.find(r=>r.phase==='race-context'&&r.sequence===entry.sequence),after=rows.find(r=>r.phase==='after'&&r.sequence===entry.sequence);
  assert.ok(observed&&ctx&&after,'Incomplete target observation');assert.equal(entry.bike,route.bike);assert.equal(observed.bike,entry.bike);assert.equal(after.bike,entry.bike);assert.equal(ctx.mode,0,'Unsupported AI target mode');
  retained??={index:b.readUInt32LE(0xafc),fieldC3C:b.readUInt32LE(0xc3c)};
  assert.equal(b.readUInt32LE(0xafc),retained.index,'Retained target index');assert.equal(b.readUInt32LE(0xc3c),retained.fieldC3C,'Retained target flag');
  const head=b.readUInt32LE(0xaf0),x=b.readFloatLE(0x4f8),z=b.readFloatLE(0x500),nearest=findMcmNearestAiRoute({head,nodes,x,z});
  const result=advanceMcmAiRouteTarget({head,nodes,table,nearest,...retained,reference:b.readInt32LE(0xc08),x,y:b.readFloatLE(0x4fc),z,heading:b.readFloatLE(0x4e0),fieldBB8:b.readUInt32LE(0xbb8)});
  const words=[result.address,result.next,result.index,result.fieldC3C,bits(result.targetHeading),bits(result.segmentHeading),result.routeDifference];
  assert.deepEqual(words,observed.words,'Computed target outputs');
  const end=Buffer.from(after.hex,'hex');assert.equal(end.readUInt32LE(0xafc),result.index);assert.equal(end.readUInt32LE(0xc3c),result.fieldC3C);
  retained={index:result.index,fieldC3C:result.fieldC3C};calls++;advances+=result.advances;checks.push({sequence:entry.sequence,words,advances:result.advances});
 }
 assert.ok(calls,'Missing AI calls');return {calls,advances,checks};
}
