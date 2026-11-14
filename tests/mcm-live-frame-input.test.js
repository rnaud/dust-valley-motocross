import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveFrameEnvironment} from '../scripts/mcm-reference/live-frame-environment.mjs';
import {encodeLiveFrameInput,compareLiveFrameInput} from '../scripts/mcm-reference/compare-live-frame-input.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-frame-input-wine11.json.br',import.meta.url))));
test('original frame-input capture supplies raw inputs and steering-device metadata',()=>{
 const {captured:c}=fixture(),e=loadLiveFrameEnvironment(c.checkpoint,c.observation);
 assert.deepEqual(e.input,{analogBits:0,longitudinalBits:0,steerBits:0,devicePresent:true,deviceByte:4,deviceKind:0});
 assert.equal(encodeLiveFrameInput(c.checkpoint,c.observation).readUInt32LE(4),54);
 const r=compareLiveFrameInput(c.checkpoint,c.observation,Buffer.from(c.outputHex,'hex'));
 assert.equal(r.comparedWords,3719);assert.equal(r.differences,0);
});
test('nonzero input, cubic steering, analog and rider-transition copies match original stores',()=>{
 const {variants}=fixture();assert.equal(variants.length,7);
 for(const v of variants){const r=compareLiveFrameInput(v.checkpoint,v.observation,Buffer.from(v.outputHex,'hex'));
  assert.equal(r.differences,0,v.name);assert.equal(r.comparedWords,3719);assert.ok(r.changedWords>=2,v.name);
 }
 const negativeZero=variants.find(v=>v.name==='negative-zero-analog');
 assert.equal(loadLiveFrameEnvironment(negativeZero.checkpoint,negativeZero.observation).input.steerBits,0x80000000);
});
test('input initialization rejects missing observations and device memory',()=>{
 const {captured:c}=fixture(),missing=structuredClone(c.observation);
 missing.blocks.pop();missing.blockCount--;
 assert.throws(()=>loadLiveFrameEnvironment(c.checkpoint,missing),/Missing checkpoint memory/);
 const old=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-frame-reset-wine11.json.br',import.meta.url)))).captured;
 assert.equal(loadLiveFrameEnvironment(old.checkpoint,old.observation).input,null);
 assert.throws(()=>encodeLiveFrameInput(old.checkpoint,old.observation),/not captured/);
 assert.throws(()=>compareLiveFrameInput(c.checkpoint,c.observation,Buffer.alloc(0)),/output size/);
});
