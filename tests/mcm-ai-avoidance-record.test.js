import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiAvoidanceRecordCases} from '../scripts/mcm-reference/ai-avoidance-record-cases.mjs';
test('all three avoidance record regions match 12288 repeated original executions',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-avoidance-record-wine11.json.br',import.meta.url))));
 const {input,expected}=generateAiAvoidanceRecordCases(),native=Buffer.from(f.native,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(input.length,12288*64);assert.equal(native.length,12288*20);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
 let active=0,inactive=0;for(let i=0;i<12288;i++){if(native.readUInt32LE(i*20))active++;else{inactive++;assert.equal(native.readUInt32LE(i*20+8),input.readUInt32LE(i*64+56));assert.equal(native.readUInt32LE(i*20+16),input.readUInt32LE(i*64+60));}}
 assert.ok(active>1000);assert.ok(inactive>1000);
});

import {analyzeAiAvoidanceRecords} from '../scripts/mcm-reference/analyze-ai-avoidance-record.mjs';
const liveFixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-avoidance-live-wine11.json.br',import.meta.url))));
const liveRows=()=>liveFixture().live.trim().split('\n').map(JSON.parse);
test('64 live controller calls derive 114 avoidance records from earlier body and actor inputs',()=>{
 const f=liveFixture();assert.equal(createHash('sha256').update(f.live).digest('hex'),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,7);
 assert.deepEqual(analyzeAiAvoidanceRecords(liveRows()),{calls:64,targetAdvances:21,records:114,active:57,inactive:57,skipped:7});
});
test('live avoidance rejects altered outputs, missing actors, body changes and eligibility changes',()=>{
 let r=liveRows();r.find(r=>r.phase==='avoidance').words[1]^=1;assert.throws(()=>analyzeAiAvoidanceRecords(r),/Computed avoidance output/);
 r=liveRows();const o=r.find(r=>r.phase==='avoidance'),b=Buffer.from(o.selfHex,'hex');b.writeFloatLE(999,0x4f8);o.selfHex=b.toString('hex');assert.throws(()=>analyzeAiAvoidanceRecords(r),/Self input mutation/);
 r=liveRows();const seq=r.find(r=>r.phase==='avoidance').sequence;r.find(r=>r.phase==='actors'&&r.sequence===seq).actors=[];assert.throws(()=>analyzeAiAvoidanceRecords(r),/record count/);
 r=liveRows();const entry=r.find(r=>r.phase==='before'&&r.sequence===seq),bytes=Buffer.from(entry.hex,'hex');bytes.writeUInt32LE(1,0x4bc);entry.hex=bytes.toString('hex');assert.throws(()=>analyzeAiAvoidanceRecords(r),/Avoidance eligibility/);
});
