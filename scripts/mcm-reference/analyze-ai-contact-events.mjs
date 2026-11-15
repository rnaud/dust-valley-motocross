import assert from 'node:assert/strict';
import {updateMcmContactResponse} from '../../src/physics/mcm/contact-response.js';
import {decodeAiMotionGraph} from './analyze-ai-motion-graph.mjs';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
const fields=['4bc','870','718','8c4','b4c','c6c','714','c78','c70','c74','53c'],floats=new Set(['718','c70','c74','53c']);
export const AI_CONTACT_BODY_OFFSETS=[...fields.map(k=>parseInt(k,16)),0x844,0x4f0,0x584,0x588,0x58c,0x4c0,0x4c4,0x4c8,0x510,0x514,0x518,0x4d8];
// Compact fixtures retain exactly the observed body words consumed here.
export function readAiContactBody(r){if(r.hex)return Buffer.from(r.hex,'hex');const b=Buffer.alloc(0xcc8);for(const offset of AI_CONTACT_BODY_OFFSETS){assert.ok(Object.hasOwn(r.bodyWords,offset),'Missing contact body word');b.writeUInt32LE(r.bodyWords[offset],offset);}return b;}
export function replayAiContactEvents(rows){
 const bike=rows.find(r=>r.phase==='before').bike,pending=new Map(),checks=[];let clears=0;
 for(let index=0;index<rows.length;index++){
  const r=rows[index];if(r.bike!==bike)continue;
  if(r.phase==='contact-response-before'){
   assert.ok(!pending.has(bike),'Unpaired contact entry');const b=readAiContactBody(r),component=Buffer.from(r.componentHex,'hex'),s=r.stack,graph=decodeAiMotionGraph(r),vector=o=>[0,4,8].map(i=>b.readFloatLE(o+i));
   const c={state844:b.readUInt32LE(0x844),anyContact:s[9],control1c:s[7],control30:s[12],frontContact:s[5],rearContact:s[6],targetRoll:b.readFloatLE(0x4f0),componentAngle:component.readFloatLE(0x44),componentLimit:component.readFloatLE(0x48),componentAxis:[0,4,8].map(i=>component.readFloatLE(0x54+i)),componentRate:float(s[10]),responseScratch:[612,608,448,444].map(o=>float(s[o/4])),rearTangent:vector(0x584),bikeForward:vector(0x4c0),velocity:vector(0x510),points:Array.from({length:5},()=>[0,0,0]),dt:float(s[4]),roll:b.readFloatLE(0x4d8),node:graph.get(component.readUInt32LE(0x50)),bodyNode:graph.get(r.root)};
   c.points[4]=[0,4,8].map(i=>float(s[(0x300+i)/4]));for(const key of fields)c['field'+key]=floats.has(key)?b.readFloatLE(parseInt(key,16)):b.readUInt32LE(parseInt(key,16));
   assert.ok(c.node&&c.bodyNode,'Missing contact graph');const before=c.fieldb4c;updateMcmContactResponse(c);pending.set(bike,{c,graph,entry:r,index,before});
  }
  if(r.phase==='contact-response-after'){
   const p=pending.get(bike);assert.ok(p,'Missing contact entry');const {c,graph,entry,before}=p,b=readAiContactBody(r),component=Buffer.from(r.componentHex,'hex');assert.equal(entry.sequence,r.sequence);assert.equal(entry.root,r.root,'Changed contact root');
   for(const key of fields)assert.equal(floats.has(key)?bits(c['field'+key]):c['field'+key],b.readUInt32LE(parseInt(key,16)),`Computed contact field ${key}`);
   assert.equal(bits(c.componentAngle),component.readUInt32LE(0x44),'Contact component angle');assert.equal(bits(c.componentRate),r.stack[10],'Contact component rate');assert.deepEqual(c.responseScratch.map(bits),[612,608,448,444].map(o=>r.stack[o/4]),'Contact response scratch');assert.equal(graph.size,r.nodes.length);
   const seen=new Set();for(const n of r.nodes){assert.ok(!seen.has(n.address),'Duplicate contact graph node');seen.add(n.address);const expected=graph.get(n.address);assert.ok(expected,'Missing contact graph node');const bytes=Buffer.from(expected.bytes);expected.local.forEach((v,i)=>bytes.writeUInt32LE(bits(v),0x84+i*4));bytes.writeUInt32LE(expected.cacheValid,0x104);assert.deepEqual(bytes,Buffer.from(n.hex,'hex'),'Computed contact graph');}
   clears+=Number(before!==c.fieldb4c);checks.push({index:p.index,exitIndex:index,sequence:r.sequence,before,latch:c.fieldb4c});pending.delete(bike);
  }
 }
 assert.equal(pending.size,0,'Missing contact exit');return {calls:checks.length,clears,checks};
}
