import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {checkpointMemory,loadLiveRider} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {compareBikeReplay} from '../scripts/mcm-reference/compare-bike.mjs';
import {compareLiveCheckpointEngine} from '../scripts/mcm-reference/compare-live-checkpoint-engine.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/rider-replay-checkpoint-wine11.json.br',import.meta.url))));

test('captured rider repeats across all 800 paired boundaries with retained engine agreement',()=>{
 const input=fixture(),report=compareBikeReplay(input.rows);
 assert.equal(report.comparedBoundaryPairs,800);
 assert.equal(report.firstMotionDifference,null);
 assert.deepEqual(report.differingRiderWords,{});
 assert.deepEqual(report.differingEngineWords,{});
 assert.deepEqual(Object.keys(report.differingBikeWords),['0x488','0x48c','0x490','0x494']);
 assert.equal(compareLiveCheckpointEngine(input).differences,0);
 const {address}=loadLiveRider(input.checkpoint),memory=checkpointMemory(input.checkpoint);
 assert.equal(memory.read(address,0x3ac).toString('hex'),input.rows[0].riderHex);
});

test('live rider preserves full event tables and unresolved resource dependencies',()=>{
 const {checkpoint}=fixture(),r=loadLiveRider(checkpoint);
 assert.deepEqual(r.records.map(groups=>groups.map(g=>g.length)),[[0,3,8],...Array.from({length:5},()=>[1,3,8])]);
 assert.equal(r.rider.visualPresent,true);assert.ok(r.visualAddress);
 assert.equal(r.rider.field154,-1);assert.equal(r.unresolvedAnimationRecords.length,16);
 const memory=checkpointMemory(checkpoint);
 for(const pointer of r.unresolvedAnimationRecords)assert.throws(()=>memory.read(pointer,4),/Missing checkpoint memory/);
 const block=checkpoint.blocks.find(b=>b.address===r.address),bytes=Buffer.from(block.hex,'hex');
 bytes.writeUInt32LE(11,0x174+0x30);block.hex=bytes.toString('hex');
 assert.throws(()=>loadLiveRider(checkpoint),/count exceeds/);
});

test('rider replay detects changed state, missing captures and wrong ownership',()=>{
 const {rows}=fixture(),row=rows[801],original=row.riderHex,bytes=Buffer.from(original,'hex');
 bytes.writeUInt32LE(1,0x138);row.riderHex=bytes.toString('hex');
 assert.deepEqual(compareBikeReplay(rows).differingRiderWords,{'0x138':{records:1,firstFrame:0,phase:'after-update'}});
 delete row.riderHex;assert.throws(()=>compareBikeReplay(rows),/Missing or invalid rider/);
 row.riderHex=original;bytes.set(Buffer.from(original,'hex'));bytes.writeUInt32LE(0,0x15c);row.riderHex=bytes.toString('hex');
 assert.throws(()=>compareBikeReplay(rows),/Rider owner or bike pointer differs/);
});
