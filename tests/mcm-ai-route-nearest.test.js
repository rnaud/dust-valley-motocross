import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {generateAiRouteNearestCases} from '../scripts/mcm-reference/ai-route-nearest-cases.mjs';
import {findMcmNearestAiRoute} from '../src/physics/mcm/ai-route-nearest.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-route-nearest-wine11.json.br',import.meta.url))));
const hash=b=>createHash('sha256').update(b).digest('hex');
const float=w=>new Float32Array(Uint32Array.of(w).buffer)[0],bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
test('nearest AI route matches 4096 original instruction executions, repeated exactly',()=>{
 const f=fixture(),{input,expected}=generateAiRouteNearestCases(),native=Buffer.from(f.native,'base64');
 assert.equal(input.length,4096*268);assert.equal(native.length,4096*12);
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);
 assert.deepEqual(expected,native);
});
test('nearest AI route matches four live controller observations over the 603-node original route',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,3);
 const rows=f.live.trim().split('\n').map(JSON.parse),route=rows.find(r=>r.phase==='route');assert.equal(route.nodes.length,603);
 const nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),z:float(n.words[2]),next:n.words[10]}]));
 const before=rows.filter(r=>r.phase==='before');assert.equal(before.length,4);
 for(const entry of before){
  const b=Buffer.from(entry.hex,'hex'),observed=rows.find(r=>r.phase==='nearest'&&r.sequence===entry.sequence),after=rows.find(r=>r.phase==='after'&&r.sequence===entry.sequence);assert.equal(observed.bike,entry.bike);assert.equal(after.bike,entry.bike);
  const r=findMcmNearestAiRoute({head:b.readUInt32LE(0xaf0),nodes,x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500)});
  assert.deepEqual([r.address,r.index,bits(r.distance)],[observed.node,observed.index,observed.distanceBits]);
 }
});
test('missing and cyclic route memory cannot silently shorten the original search',()=>{
 assert.throws(()=>findMcmNearestAiRoute({head:1,nodes:new Map(),x:0,z:0}),/Missing/);
 assert.throws(()=>findMcmNearestAiRoute({head:1,nodes:new Map([[1,{x:0,z:0,next:1}]]),x:0,z:0}),/Cyclic/);
});
