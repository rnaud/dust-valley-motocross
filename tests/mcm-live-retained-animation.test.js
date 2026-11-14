import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveNormalRider} from '../scripts/mcm-reference/live-normal-rider.mjs';
import {compareLiveNormalRider} from '../scripts/mcm-reference/compare-live-normal-rider.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-animation-wine11.json.br',import.meta.url))));
test('live animation bootstrap preserves history identity, nulls and fractional time',()=>{
 const {checkpoint,observation}=fixture(),{context,assets}=loadLiveNormalRider(checkpoint,observation);
 assert.equal(context.bikeAnimation.displayedFrame,null);
 assert.equal(context.bikeAnimation.previousFrame,null);
 assert.equal(context.bikeAnimation.blendFrame,null);
 const rider=context.riderAnimation;
 assert.equal(rider.displayedFrame,rider.previousFrame);
 assert.equal(rider.displayedFrame.token,observation.retainedFrames[3]);
 assert.equal(rider.blendFrame.token,observation.retainedFrames[5]);
 assert.notEqual(rider.blendFrame,rider.displayedFrame);
 assert.equal(rider.remainder,0.007666764780879021);
 assert.equal(rider.stopped,1);assert.equal(rider.blending,0);
 assert.equal(assets.frames.size,664);
 const activeFrames=new Set();for(const record of assets.records)for(let f=record.firstFrame;f;f=f.next)activeFrames.add(f);
 assert.equal(activeFrames.has(rider.displayedFrame),false);
 assert.equal(activeFrames.has(rider.blendFrame),false);
});
test('retained history capture matches original normal-rider execution including untouched history',()=>{
 const {checkpoint,observation,outputHex}=fixture();
 const report=compareLiveNormalRider(checkpoint,observation,Buffer.from(outputHex,'hex'));
 assert.equal(report.comparedWords,110493);assert.equal(report.changedWords,22);assert.equal(report.differences,0);
});
test('live animation bootstrap rejects missing history and mismatched snapshot pointers',()=>{
 const {checkpoint,observation}=fixture();
 const incomplete=structuredClone(observation),token=incomplete.retainedFrames[5];
 incomplete.blocks=incomplete.blocks.filter(b=>b.address!==token);incomplete.blockCount=incomplete.blocks.length;
 assert.throws(()=>loadLiveNormalRider(checkpoint,incomplete),/Wrong animation block type/);
 const mismatched=structuredClone(observation);mismatched.retainedFrames[0]=mismatched.retainedFrames[3];
 assert.throws(()=>loadLiveNormalRider(checkpoint,mismatched),/pointers differ/);
});
