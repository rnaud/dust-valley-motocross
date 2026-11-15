import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiRouteTargetCases} from '../scripts/mcm-reference/ai-route-target-cases.mjs';
import {analyzeAiRouteTargets} from '../scripts/mcm-reference/analyze-ai-route-target.mjs';
import {advanceMcmAiRouteTarget} from '../src/physics/mcm/ai-route-target.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-route-target-wine11.json.br',import.meta.url))));
const hash=b=>createHash('sha256').update(b).digest('hex');const rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
test('mode-0 target loop matches 4096 native cases including repeated advancement',()=>{
 const f=fixture(),{input,expected,skipped,advanced,multiple}=generateAiRouteTargetCases(),native=Buffer.from(f.native,'base64');
 assert.equal(skipped,0);assert.equal(advanced,1902);assert.equal(multiple,848);assert.equal(input.length,4096*424);assert.equal(native.length,4096*28);
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('64 live target decisions retain index and flag across 11 advances',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,3);
 const result=analyzeAiRouteTargets(rows());assert.equal(result.calls,64);assert.equal(result.advances,11);
});
test('observed outputs cannot replace computed headings or reseed retained targets',()=>{
 let r=rows();r.find(r=>r.phase==='target').words[4]^=1;assert.throws(()=>analyzeAiRouteTargets(r),/Computed target/);
 r=rows();const entry=r.filter(r=>r.phase==='before')[1],b=Buffer.from(entry.hex,'hex');b.writeUInt32LE(b.readUInt32LE(0xafc)+1,0xafc);entry.hex=b.toString('hex');assert.throws(()=>analyzeAiRouteTargets(r),/Retained target index/);
 assert.throws(()=>advanceMcmAiRouteTarget({mode:1}),/Missing AI route inputs/);
});
