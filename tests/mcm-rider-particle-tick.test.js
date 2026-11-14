import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareRiderParticleTick} from '../scripts/mcm-reference/compare-rider-particle-tick.mjs';
import {tickMcmRiderParticles} from '../src/physics/mcm/rider-particle-tick.js';
const fixture=()=>{
 const data=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/rider-particle-tick-wine11.json.br',import.meta.url))));
 return {input:Buffer.from(data.input,'base64'),output:Buffer.from(data.output,'base64')};
};
test('rider-particle tick and particle writes match 160 original executable cases',()=>{
 const {input,output}=fixture(),report=compareRiderParticleTick(input,output);
 assert.equal(report.cases,160);assert.equal(report.comparedWords,2782560);assert.equal(report.changedWords,2123);assert.deepEqual(report.differences,[]);
 // Check an untouched particle word too: the comparison covers whole records.
 output[0x61c+0x24]^=1;
 assert.deepEqual(compareRiderParticleTick(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x640]]);
});
test('active rider particles require pool state and table-boundary bytes',()=>{
 const {input}=fixture(),bytes=Buffer.from(input.subarray(5*0x624,6*0x624)),view=new DataView(bytes.buffer,bytes.byteOffset,0x610);
 assert.throws(()=>tickMcmRiderParticles(view,{dt:.02,paused:0}),/captured particle pool/);
 const record=new DataView(new ArrayBuffer(0x44));
 assert.throws(()=>tickMcmRiderParticles(view,{dt:.02,paused:0,pool:{count:0,particle:()=>record}}),/boundary bytes/);
});
