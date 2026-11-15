import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiRouteGuidanceCases} from '../scripts/mcm-reference/ai-route-guidance-cases.mjs';
import {analyzeAiRouteGuidance} from '../scripts/mcm-reference/analyze-ai-route-guidance.mjs';
import {computeMcmAiRouteGuidance} from '../src/physics/mcm/ai-route-guidance.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-route-guidance-wine11.json.br',import.meta.url))));
const hash=b=>createHash('sha256').update(b).digest('hex'),rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
test('mode-0 guidance matches six output words from 4096 repeated original executions',()=>{
 const f=fixture(),{input,expected}=generateAiRouteGuidanceCases(),native=Buffer.from(f.native,'base64');assert.equal(input.length,4096*240);assert.equal(native.length,4096*24);
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('64 live guidance calls derive nearest segments and retained targets across six advances',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,4);
 const r=analyzeAiRouteGuidance(rows());assert.equal(r.calls,64);assert.equal(r.targetAdvances,6);assert.equal(r.lookaheadBits,1111490560);
});
test('guidance outputs, route offsets and later lookahead snapshots cannot silently drive recovery',()=>{
 let r=rows();r.find(r=>r.phase==='guidance').words[5]^=1;assert.throws(()=>analyzeAiRouteGuidance(r),/Computed guidance/);
 r=rows();r.filter(r=>r.phase==='guidance')[1].lookaheadBits^=1;assert.throws(()=>analyzeAiRouteGuidance(r),/lookahead mutation/);
 r=rows();const route=r.find(r=>r.phase==='route');for(const n of route.nodes)n.words[6]=0x447a0000;assert.throws(()=>analyzeAiRouteGuidance(r),/Computed guidance/);
 assert.throws(()=>computeMcmAiRouteGuidance({mode:1}),/Missing AI mode-1 direction/);
});
