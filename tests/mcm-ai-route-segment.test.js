import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {generateAiRouteSegmentCases} from '../scripts/mcm-reference/ai-route-segment-cases.mjs';
import {selectMcmAiRouteSegment} from '../src/physics/mcm/ai-route-segment.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-route-segment-wine11.json.br',import.meta.url))));
const hash=b=>createHash('sha256').update(b).digest('hex');
const float=w=>new Float32Array(Uint32Array.of(w).buffer)[0],bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
test('AI route segment matches 4096 original instruction executions, repeated exactly',()=>{
 const f=fixture(),{input,expected}=generateAiRouteSegmentCases(),native=Buffer.from(f.native,'base64');
 assert.equal(input.length,4096*524);assert.equal(native.length,4096*32);
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);
 assert.deepEqual(expected,native);
});
test('AI route segment matches four live controller observations over the 603-node original route',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,3);
 const rows=f.live.trim().split('\n').map(JSON.parse),route=rows.find(r=>r.phase==='route');assert.equal(route.nodes.length,603);
 const nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),z:float(n.words[2]),speed:float(n.words[3]),kind:n.words[4],next:n.words[10]}]));
 const before=rows.filter(r=>r.phase==='before');assert.equal(before.length,4);
 for(const entry of before){
  const b=Buffer.from(entry.hex,'hex'),observed=rows.find(r=>r.phase==='segment'&&r.sequence===entry.sequence),after=rows.find(r=>r.phase==='after'&&r.sequence===entry.sequence);assert.equal(observed.bike,entry.bike);assert.equal(after.bike,entry.bike);
  const r=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes,table:route.nodes.map(n=>n.address),x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500)});
  assert.deepEqual([r.address,r.index,r.next,r.previous,bits(r.inverseLength),bits(r.speed),+r.class27,+r.class3456],observed.words);
 }
});
test('empty routes and missing neighbors are rejected',()=>{
 assert.throws(()=>selectMcmAiRouteSegment({head:0,nodes:new Map(),table:[],x:0,z:0}),/nonempty/);
 assert.throws(()=>selectMcmAiRouteSegment({head:1,nodes:new Map([[1,{x:0,z:0,next:0,speed:1,kind:0}]]),table:[2],x:0,z:0}),/neighbor/);
});
