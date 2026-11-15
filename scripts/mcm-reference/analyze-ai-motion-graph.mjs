import assert from 'node:assert/strict';
import {advanceMcmAiMotion} from '../../src/physics/mcm/ai-motion.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function decodeAiMotionGraph(entry){
 const graph=new Map(entry.nodes.map(n=>{const bytes=Buffer.from(n.hex,'hex');assert.equal(bytes.length,0x114);return [n.address,{bytes,local:Array.from({length:16},(_,i)=>bytes.readFloatLE(0x84+i*4)),cacheValid:bytes.readUInt32LE(0x104)}];}));
  for(const n of graph.values())for(const [key,offset] of [['firstChild',0x10c],['nextSibling',0x110]]){const a=n.bytes.readUInt32LE(offset);if(a){assert.ok(graph.has(a),'Incomplete graph closure');n[key]=graph.get(a);}}
 return graph;
}
// Stage-local graph validation. Incoming graph/commands are observed boundaries;
// every byte of each captured node is compared, including untouched fields.
export function analyzeAiMotionGraph(rows){
 let calls=0,rotations=0,boosts=0,nodes=0,invalidations=0;
 const offsets=[0x510,0x514,0x518,0x4c0,0x4c4,0x4c8,0x4cc,0x4d0,0x4d4,0x6a4,0xb14,0xb0c,0xb10,0xb6c];
 for(const entry of rows.filter(r=>r.phase==='motion-graph-before')){
  const exit=rows.find(r=>r.phase==='motion-graph-after'&&r.sequence===entry.sequence&&r.bike===entry.bike);assert.ok(exit,'Missing graph exit');assert.equal(entry.root,exit.root,'Changed motion root');
  const graph=decodeAiMotionGraph(entry);
  const root=graph.get(entry.root);assert.ok(root,'Missing graph root');
  const b=Buffer.from(entry.hex,'hex'),s=entry.stack,r=advanceMcmAiMotion({airborne:!!b.readUInt32LE(0x4bc),speed:b.readFloatLE(0x6a4),turnScale:float(s[27]),difference:float(s[11]),dt:float(s[47]),pitchAngle:float(s[30]),throttle:b.readFloatLE(0xb04),oldSpeed:float(s[16]),heading:float(s[20]),velocity:[0x510,0x514,0x518].map(o=>b.readFloatLE(o)),forward:[0x4c0,0x4c4,0x4c8].map(o=>b.readFloatLE(o)),up:[0x4cc,0x4d0,0x4d4].map(o=>b.readFloatLE(o)),fieldb6c:b.readUInt32LE(0xb6c)},root);
  const words=[...r.velocity.map(bits),...Array.from(r.forward,bits),...Array.from(r.up,bits),bits(r.speed),bits(r.oldSpeed),bits(r.difference),bits(r.heading),r.fieldb6c],body=Buffer.from(exit.hex,'hex');assert.deepEqual(words,offsets.map(o=>body.readUInt32LE(o)),`Motion graph body ${entry.sequence}`);
  assert.equal(exit.nodes.length,graph.size,'Graph node count');const seen=new Set();
  for(const observed of exit.nodes){assert.ok(!seen.has(observed.address),'Duplicate graph node');seen.add(observed.address);const n=graph.get(observed.address);assert.ok(n,'Unexpected graph node');const expected=Buffer.from(n.bytes);for(let i=0;i<16;i++)expected.writeUInt32LE(bits(n.local[i]),0x84+i*4);expected.writeUInt32LE(n.cacheValid,0x104);assert.deepEqual(expected,Buffer.from(observed.hex,'hex'),`Computed graph node ${entry.sequence}:${observed.address}`);invalidations+=Number(n.bytes.readUInt32LE(0x104)!==n.cacheValid);nodes++;}
  rotations+=Number(r.rotated);boosts+=Number(r.boosted);calls++;
 }
 assert.ok(calls,'Missing graph calls');assert.equal(calls,rows.filter(r=>r.phase==='motion-graph-after').length,'Graph call count');return {calls,rotations,boosts,nodes,invalidations};
}
