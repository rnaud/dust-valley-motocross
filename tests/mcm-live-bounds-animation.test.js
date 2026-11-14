import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveNormalRider} from '../scripts/mcm-reference/live-normal-rider.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-bounds-animation-wine11.json.br',import.meta.url))));
test('atomic original bounds capture preserves frames outside the animation table',()=>{
 const {checkpoint,observation}=fixture(),{assets}=loadLiveNormalRider(checkpoint,observation);
 assert.deepEqual(observation.boundsFrames,[0x019a4740,0x01b05e60]);
 const active=new Set();for(const record of assets.records)for(let f=record.firstFrame;f;f=f.next)active.add(f);
 for(const token of observation.boundsFrames){
  const frame=assets.frames.get(token);assert.ok(frame);assert.equal(active.has(frame),false);
  assert.ok(frame.boundsMin.every(Number.isFinite));assert.ok(frame.boundsMax.every(Number.isFinite));
  for(let child=frame.firstChild;child;child=child.next)assert.equal(child,assets.children.get(child.token));
 }
});
test('bounds bootstrap rejects missing frames and checkpoint pointer mismatches',()=>{
 const {checkpoint,observation}=fixture();
 const missing=structuredClone(observation);missing.blocks=missing.blocks.filter(b=>b.address!==missing.boundsFrames[0]);missing.blockCount=missing.blocks.length;
 assert.throws(()=>loadLiveNormalRider(checkpoint,missing),/Wrong animation block type/);
 const mismatch=structuredClone(observation);mismatch.boundsFrames.reverse();
 assert.throws(()=>loadLiveNormalRider(checkpoint,mismatch),/Bounds animation pointers differ/);
});
