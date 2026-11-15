import assert from 'node:assert/strict';
import {decodeAiMotionGraph} from './analyze-ai-motion-graph.mjs';
import {replayAiLandingPitch} from './analyze-ai-landing-pitch.mjs';
import {replayAiMotion} from './analyze-ai-motion.mjs';
import {startMcmTrick} from '../../src/physics/mcm/trick-start.js';
import {advanceMcmAiMotion} from '../../src/physics/mcm/ai-motion.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
const vector=(b,o)=>[0,4,8].map(i=>b.readFloatLE(o+i));
// One graph per controller call, initialized only from controller entry.
// Trick-stage and motion-stage graph snapshots are never used as graph inputs.
export function analyzeAiControllerGraph(rows,options){
 const indexed=r=>new Map(r.checks.map(c=>[c.sequence,c])),jump=indexed(replayAiLandingPitch(rows,options)),motion=indexed(replayAiMotion(rows,options));
 let calls=0,tricks=0,resets=0,rotations=0,nodes=0;
 for(const entry of rows.filter(r=>r.phase==='controller-graph-before')){
  const exit=rows.find(r=>r.phase==='controller-graph-after'&&r.sequence===entry.sequence),before=rows.find(r=>r.phase==='before'&&r.sequence===entry.sequence);
  const bodyExit=rows.find(r=>r.phase==='after'&&r.sequence===entry.sequence);assert.ok(exit&&before&&bodyExit,'Missing complete graph boundary');assert.equal(exit.hex,bodyExit.hex,'Controller graph body exit');assert.equal(entry.bike,before.bike);assert.equal(entry.hex,before.hex,'Controller graph body entry');
  for(const key of ['bike','root','source','bounds'])assert.equal(exit[key],entry[key],`Controller graph identity ${key}`);
  assert.deepEqual(exit.animations,entry.animations,'Animation resource mutation');assert.equal(entry.animations.length,16);
  const graph=decodeAiMotionGraph(entry);
  for(const node of graph.values()){node.world=Array.from({length:16},(_,i)=>node.bytes.readFloatLE(0xc4+i*4));const parent=node.bytes.readUInt32LE(0x108);if(parent){assert.ok(graph.has(parent),'Missing controller ancestor');node.parent=graph.get(parent);}}
  const b=Buffer.from(entry.hex,'hex'),bounds=Buffer.from(entry.bounds,'hex'),proxy=Buffer.from(entry.proxy,'hex'),envelope=Buffer.from(entry.envelope,'hex'),components=[],boundsChildren=[];
  const records=entry.records.map(record=>({...record,bytes:Buffer.from(record.hex,'hex')}));
  for(const record of records){const bytes=record.bytes,componentIndex=bytes[0];assert.ok(graph.has(record.component),'Missing controller component');components[componentIndex]=graph.get(record.component);boundsChildren.push({componentIndex,local:!!bytes.readUInt32LE(4),forward:vector(bytes,8),up:vector(bytes,0x14),position:vector(bytes,0x20)});}
  const target=graph.get(entry.root),source=graph.get(entry.source);assert.ok(target&&source,'Missing controller roots');
  entry.animations.forEach(([bp,rp],i)=>{assert.equal(bp,b.readUInt32LE(0x7d4+i*4));assert.equal(rp,b.readUInt32LE(0x794+i*4));});
  const selected=jump.get(entry.sequence).trickSelected;
  if(selected!==null){
   assert.ok(selected>=0&&selected<16);const setup={graph:{target,source,components,boundsChildren},liveBoundsMin:vector(b,0x218),liveBoundsMax:vector(b,0x224),scratch540:vector(b,0x540),scratch54c:vector(b,0x54c),boundsMin:vector(bounds,0x1c),boundsMax:vector(bounds,0x28)};
   const result=startMcmTrick({setup,field820:b.readUInt32LE(0x820),trickIndex:selected,time:b.readFloatLE(0x8cc),bikeAnimationRecords:entry.animations.map(a=>a[2]),riderAnimationRecords:entry.animations.map(a=>a[3])});
   [4,0x10,0x14,0x30,0x2c].forEach((offset,i)=>proxy.writeUInt32LE((i===1?entry.animations[selected][1]:result.riderAnimation[i])>>>0,offset));result.envelope.forEach((v,i)=>envelope.writeUInt32LE(bits(v),i*4));
   if(b.readUInt32LE(0x820))records.forEach((record,i)=>{boundsChildren[i].forward.forEach((v,k)=>record.bytes.writeUInt32LE(bits(v),8+k*4));boundsChildren[i].up.forEach((v,k)=>record.bytes.writeUInt32LE(bits(v),0x14+k*4));});
   tricks++;resets+=Number(!!b.readUInt32LE(0x820));
  }
  const result=advanceMcmAiMotion(motion.get(entry.sequence).input,target);rotations+=Number(result.rotated);
  assert.deepEqual(proxy,Buffer.from(exit.proxy,'hex'),'Complete controller rider animation');assert.deepEqual(envelope,Buffer.from(exit.envelope,'hex'),'Complete controller envelope');
  assert.equal(records.length,exit.records.length);records.forEach((record,i)=>{assert.equal(record.address,exit.records[i].address);assert.equal(record.component,exit.records[i].component);assert.deepEqual(record.bytes,Buffer.from(exit.records[i].hex,'hex'),'Complete controller bounds record');});
  assert.equal(exit.nodes.length,graph.size);const seen=new Set();
  for(const observed of exit.nodes){assert.ok(!seen.has(observed.address),'Duplicate controller graph node');seen.add(observed.address);const node=graph.get(observed.address);assert.ok(node,'Unexpected controller graph node');const bytes=Buffer.from(node.bytes);for(const [offset,values] of [[0x84,node.local],[0xc4,node.world]])values.forEach((v,i)=>bytes.writeUInt32LE(bits(v),offset+i*4));bytes.writeUInt32LE(node.cacheValid>>>0,0x104);assert.deepEqual(bytes,Buffer.from(observed.hex,'hex'),`Complete controller graph ${entry.sequence}:${observed.address}`);nodes++;}
  calls++;
 }
 assert.ok(calls,'Missing controller graph calls');assert.equal(calls,jump.size);assert.equal(calls,rows.filter(r=>r.phase==='controller-graph-after').length);return {calls,tricks,resets,rotations,nodes};
}
