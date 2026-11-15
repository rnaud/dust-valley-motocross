import assert from 'node:assert/strict';
import {decodeAiMotionGraph} from './analyze-ai-motion-graph.mjs';
import {startMcmTrick} from '../../src/physics/mcm/trick-start.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
const vector=(b,o)=>[0,4,8].map(i=>b.readFloatLE(o+i));
export function analyzeAiTrickGraph(rows){
 let calls=0,resets=0,nodes=0;const checks=[];
 for(let index=0;index<rows.length;index++){
  const entry=rows[index];if(entry.phase!=='trick-graph-before')continue;
  const exit=rows[index+1];assert.ok(exit&&exit.phase==='trick-graph-after','Missing adjacent trick exit');
  for(const key of ['sequence','bike','selected','root','source','bikeRecord','riderRecord','bikeValue','riderValue'])assert.equal(exit[key],entry[key],`Trick identity ${key}`);
  const graph=decodeAiMotionGraph(entry);
  for(const node of graph.values()){
   node.world=Array.from({length:16},(_,i)=>node.bytes.readFloatLE(0xc4+i*4));
   const parent=node.bytes.readUInt32LE(0x108);if(parent){assert.ok(graph.has(parent),'Missing trick ancestor');node.parent=graph.get(parent);}
  }
  const b=Buffer.from(entry.hex,'hex'),bounds=Buffer.from(entry.bounds,'hex'),components=[],boundsChildren=[];
  for(const record of entry.records){const bytes=Buffer.from(record.hex,'hex'),componentIndex=bytes[0];assert.ok(graph.has(record.component),'Missing bounds component');components[componentIndex]=graph.get(record.component);boundsChildren.push({componentIndex,local:!!bytes.readUInt32LE(4),forward:vector(bytes,8),up:vector(bytes,0x14),position:vector(bytes,0x20)});}
  const target=graph.get(entry.root),source=graph.get(entry.source);assert.ok(target&&source,'Missing trick roots');
  const setup={graph:{target,source,components,boundsChildren},liveBoundsMin:vector(b,0x218),liveBoundsMax:vector(b,0x224),scratch540:vector(b,0x540),scratch54c:vector(b,0x54c),boundsMin:vector(bounds,0x1c),boundsMax:vector(bounds,0x28)};
  const bikeAnimationRecords=[],riderAnimationRecords=[];bikeAnimationRecords[entry.selected]=entry.bikeValue;riderAnimationRecords[entry.selected]=entry.riderValue;
  const result=startMcmTrick({setup,field820:b.readUInt32LE(0x820),trickIndex:entry.selected,time:b.readFloatLE(0x8cc),bikeAnimationRecords,riderAnimationRecords});
  const expected=Buffer.from(b),proxy=Buffer.from(entry.proxy,'hex'),envelope=Buffer.alloc(16);
  for(const [offset,value] of [[0x820,result.field820],[0x710,result.field710],[0x818,result.awardBase],[0xb4c,result.fieldb4c]])expected.writeUInt32LE(value>>>0,offset);
  expected.writeUInt8(result.animation,0x814);
  for(const [offset,values] of [[0x218,result.boundsMin],[0x224,result.boundsMax],[0x540,result.scratch540],[0x54c,result.scratch54c]])values.forEach((value,i)=>expected.writeUInt32LE(bits(value),offset+i*4));
  const animation=(bytes,values,pointer)=>[4,0x10,0x14,0x30,0x2c].forEach((offset,i)=>bytes.writeUInt32LE((i===1?pointer:values[i])>>>0,offset));
  animation(expected,result.bikeAnimation,entry.bikeRecord);animation(proxy,result.riderAnimation,entry.riderRecord);result.envelope.forEach((value,i)=>envelope.writeUInt32LE(bits(value),i*4));
  assert.deepEqual(expected,Buffer.from(exit.hex,'hex'),'Computed complete trick body');assert.deepEqual(proxy,Buffer.from(exit.proxy,'hex'),'Computed rider animation');assert.deepEqual(envelope,Buffer.from(exit.envelope,'hex'),'Computed trick envelope');
  assert.equal(exit.bounds,entry.bounds,'Unchanged bounds resource');assert.equal(exit.records.length,entry.records.length);entry.records.forEach((record,i)=>{const expected=Buffer.from(record.hex,'hex'),child=boundsChildren[i];if(b.readUInt32LE(0x820)){child.forward.forEach((v,k)=>expected.writeUInt32LE(bits(v),8+k*4));child.up.forEach((v,k)=>expected.writeUInt32LE(bits(v),0x14+k*4));}assert.equal(exit.records[i].address,record.address);assert.equal(exit.records[i].component,record.component);assert.deepEqual(expected,Buffer.from(exit.records[i].hex,'hex'),'Computed bounds record');});
  assert.equal(exit.nodes.length,graph.size);const seen=new Set();
  for(const observed of exit.nodes){assert.ok(!seen.has(observed.address),'Duplicate trick node');seen.add(observed.address);const node=graph.get(observed.address);assert.ok(node,'Unexpected trick node');const bytes=Buffer.from(node.bytes);for(const [offset,values] of [[0x84,node.local],[0xc4,node.world]])values.forEach((v,i)=>bytes.writeUInt32LE(bits(v),offset+i*4));bytes.writeUInt32LE(node.cacheValid>>>0,0x104);assert.deepEqual(bytes,Buffer.from(observed.hex,'hex'),`Computed trick graph node ${entry.sequence}:${observed.address}`);nodes++;}
  calls++;resets+=Number(!!b.readUInt32LE(0x820));checks.push({sequence:entry.sequence,selected:entry.selected});
 }
 assert.ok(calls,'No successful trick starts captured');assert.equal(rows.filter(r=>r.phase==='trick-graph-after').length,calls,'Unmatched trick exits');return {calls,resets,nodes,checks};
}
