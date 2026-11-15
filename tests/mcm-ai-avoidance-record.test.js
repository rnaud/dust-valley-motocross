import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiAvoidanceRecordCases} from '../scripts/mcm-reference/ai-avoidance-record-cases.mjs';
test('all three avoidance record regions match 12288 repeated original executions',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-avoidance-record-wine11.json.br',import.meta.url))));
 const {input,expected}=generateAiAvoidanceRecordCases(),native=Buffer.from(f.native,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(input.length,12288*64);assert.equal(native.length,12288*20);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
 let active=0,inactive=0;for(let i=0;i<12288;i++){if(native.readUInt32LE(i*20))active++;else{inactive++;assert.equal(native.readUInt32LE(i*20+8),input.readUInt32LE(i*64+56));assert.equal(native.readUInt32LE(i*20+16),input.readUInt32LE(i*64+60));}}
 assert.ok(active>1000);assert.ok(inactive>1000);
});
