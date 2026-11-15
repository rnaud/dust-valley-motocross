import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiJumpStateCases} from '../scripts/mcm-reference/ai-jump-state-cases.mjs';
import {analyzeAiJumpState} from '../scripts/mcm-reference/analyze-ai-jump-state.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-jump-state-wine11.json.br',import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
test('AI jump-state outputs and random state match 4096 repeated original executions',()=>{
 const f=fixture(),{input,expected}=generateAiJumpStateCases(),native=Buffer.from(f.native,'base64');assert.equal(input.length,4096*136);assert.equal(native.length,4096*56);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.outputSha256,f.provenance.repeatSha256);assert.equal(f.provenance.exeSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.deepEqual(expected,native);
});
test('live jump stage matches eight body fields, flight time and 123 draws across 256 calls',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,17);assert.deepEqual(analyzeAiJumpState(rows()),{calls:256,draws:123,allDraws:138});
});
test('jump stage rejects altered flight time, velocity, random state and missing outputs',()=>{
 let r=rows();r.find(x=>x.phase==='steering-control-before').stack[13]^=1;assert.throws(()=>analyzeAiJumpState(r),/flight/);
 r=rows();const o=r.find(x=>x.phase==='steering-control-before'),b=Buffer.from(o.hex,'hex');b.writeUInt32LE(b.readUInt32LE(0x514)^1,0x514);o.hex=b.toString('hex');assert.throws(()=>analyzeAiJumpState(r),/field 514/);
 r=rows();r.filter(x=>x.phase==='random')[1].state^=1;assert.throws(()=>analyzeAiJumpState(r),/random/);
 r=rows();r.splice(r.findIndex(x=>x.phase==='steering-control-before'),1);assert.throws(()=>analyzeAiJumpState(r),/observation count/);
});
