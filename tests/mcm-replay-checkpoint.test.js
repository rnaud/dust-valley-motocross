import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {encodeReplayCheckpoint} from '../scripts/mcm-reference/encode-replay-checkpoint.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/contact-stack-replay-wine11.json.br',import.meta.url)))).checkpoint;
test('replay import encoding preserves all original addresses and bytes in discovery order',()=>{
 const c=fixture(),bytes=encodeReplayCheckpoint(c);assert.deepEqual(bytes.subarray(0,8),Buffer.from('MCMCP01\0'));assert.equal(bytes.readUInt32LE(8),c.bikeAddress);assert.equal(bytes.readUInt32LE(12),42);
 let cursor=16;for(const b of c.blocks){assert.equal(bytes.readUInt32LE(cursor),b.address);assert.equal(bytes.readUInt32LE(cursor+4),b.size);cursor+=8;assert.equal(bytes.subarray(cursor,cursor+b.size).toString('hex'),b.hex);cursor+=b.size;}assert.equal(cursor,bytes.length);
});
test('replay encoding rejects wrong player ownership and incomplete physics graph',()=>{
 const c=fixture(),bike=c.blocks[0],bytes=Buffer.from(bike.hex,'hex');bytes.writeUInt32LE(0,0);bike.hex=bytes.toString('hex');assert.throws(()=>encodeReplayCheckpoint(c),/vtable/);
 const missing=fixture();missing.blocks.pop();missing.blockCount--;assert.throws(()=>encodeReplayCheckpoint(missing),/Missing checkpoint/);
 const order=fixture();[order.blocks[0],order.blocks[1]]=[order.blocks[1],order.blocks[0]];assert.throws(()=>encodeReplayCheckpoint(order),/layout/);
});

import {compareReplayTimingExperiment} from '../scripts/mcm-reference/compare-replay-timing-experiment.mjs';
const experiment=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/same-start-timing-wine11.json.br',import.meta.url))));
test('identical local checkpoints do not conceal divergence with controlled rider timing',()=>{
 const r=compareReplayTimingExperiment(experiment());
 assert.equal(r.checkpointBlocks,42);assert.equal(r.observed.firstMotionDifference.frame,113);
 assert.equal(r.fixed.timing.differences,0);assert.equal(r.fixed.firstRiderDifference.firstFrame,1);
 assert.equal(r.fixed.firstMotionDifference.frame,55);assert.equal(r.fixed.firstRandomDifference.frame,104);
 assert.ok(r.fixed.differingBikeWords['0x540']);assert.ok(r.fixed.differingStackWordCount>0);
});
test('timing experiment rejects unequal local checkpoints or initial bike state',()=>{
 const e=experiment();e.fixed.checkpoint.blocks[0].hex=e.fixed.checkpoint.blocks[0].hex.slice(0,-2)+'ff';
 assert.throws(()=>compareReplayTimingExperiment(e),/checkpoints differ/);
 const f=experiment();f.fixed.rows[0].stateHex='00'+f.fixed.rows[0].stateHex.slice(2);assert.throws(()=>compareReplayTimingExperiment(f),/initial bike state/);
});
