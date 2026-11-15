import {analyzeAiControllerBody} from '../scripts/mcm-reference/analyze-ai-controller-body.mjs';
import {replayAiContactEvents} from '../scripts/mcm-reference/analyze-ai-contact-events.mjs';
import {analyzeAiTrickGraph} from '../scripts/mcm-reference/analyze-ai-trick-graph.mjs';
import {analyzeAiTrickSelect} from '../scripts/mcm-reference/analyze-ai-trick-select.mjs';
import {analyzeAiAllocations} from '../scripts/mcm-reference/analyze-ai-allocations.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeAiMotionGraph} from '../scripts/mcm-reference/analyze-ai-motion-graph.mjs';import {analyzeAiMotion} from '../scripts/mcm-reference/analyze-ai-motion.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-controller-events').live.trim().split('\n').map(JSON.parse);
function options(){const f=read('ai-final-controls'),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(i=>i===null?null:node(i));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
test('complete recovered controller body matches all 359920 captured bytes',()=>{
 const result=analyzeAiControllerBody(rows(),options());assert.equal(result.calls,110);assert.equal(result.comparedBytes,359920);assert.equal(result.changedWords,1310);assert.equal(result.changedOffsets.length,48);
 for(const offset of ['40c','218','540','10','14','818','820','6f4','b04','b4c'])assert.ok(result.changedOffsets.includes(offset));
});
test('complete body comparison rejects writes outside previously checked stage fields',()=>{
 const original=rows();for(const offset of [0x28,0x100,0x815,0xcc7]){const r=[...original],index=r.findIndex(x=>x.phase==='after'),body=Buffer.from(r[index].hex,'hex');body[offset]^=1;r[index]={...r[index],hex:body.toString('hex')};assert.throws(()=>analyzeAiControllerBody(r,options()),/Complete controller body/);}
});
test('complete body replay keeps the missing-contact transition guard',()=>{
 assert.throws(()=>analyzeAiControllerBody(rows().filter(r=>!r.phase.startsWith('contact-response')),options()),/Retained jump entry 109 field b4c/);
});
test('512-call trace matches the full body through eight orientation-reset tricks',()=>{
 const f=read('ai-controller-body');assert.equal(hash(f.live),f.provenance.liveSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.provenance.capture,/renderFrames=512 status=1 contactChanges=0 trickEvents=8/);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,28);
 const r=f.live.trim().split('\n').map(JSON.parse),tricks=analyzeAiTrickGraph(r);assert.equal(tricks.calls,8);assert.equal(tricks.resets,8);assert.equal(tricks.nodes,64);assert.deepEqual([...new Set(tricks.checks.map(t=>t.selected))].sort((a,b)=>a-b),[0,7,8,9,10]);
 const result=analyzeAiControllerBody(r,options());assert.equal(result.calls,512);assert.equal(result.comparedBytes,1675264);assert.equal(result.changedWords,6282);assert.equal(result.changedOffsets.length,51);for(const offset of ['4','b08','b48','b6c','c44'])assert.ok(result.changedOffsets.includes(offset));
});
