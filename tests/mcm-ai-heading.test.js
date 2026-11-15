import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiHeadingCases} from '../scripts/mcm-reference/ai-heading-cases.mjs';
import {analyzeAiSteeringDifference} from '../scripts/mcm-reference/analyze-ai-steering-difference.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-heading-wine11.json.br',import.meta.url)))),hash=b=>createHash('sha256').update(b).digest('hex'),rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
test('heading override and airborne branches match 8192 repeated original executions',()=>{
 const f=fixture(),{input,expected}=generateAiHeadingCases(),native=Buffer.from(f.native,'base64');assert.equal(input.length,8192*52);assert.equal(native.length,8192*4);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('live recovery joins all 64 heading and steering results across ground and airborne calls',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,11);assert.deepEqual(analyzeAiSteeringDifference(rows()),{calls:64,airborne:28,ground:36});
});
test('heading and airborne outputs are assertions, never injected into recovery',()=>{
 let r=rows();r.find(r=>r.phase==='heading-override').stack[0x4c/4]^=1;assert.throws(()=>analyzeAiSteeringDifference(r),/Computed heading override/);
 r=rows();const entry=r.find(r=>r.phase==='before'&&Buffer.from(r.hex,'hex').readUInt32LE(0x4bc));r.find(r=>r.phase==='steering-difference'&&r.sequence===entry.sequence).stack[0x2c/4]^=1;assert.throws(()=>analyzeAiSteeringDifference(r),/Computed steering difference/);
 r=rows().filter(r=>r.phase!=='heading-override');assert.throws(()=>analyzeAiSteeringDifference(r),/Heading observation count/);
});
