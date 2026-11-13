import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {checkpointMemory,loadLiveEngine} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {compareLiveCheckpointEngine} from '../scripts/mcm-reference/compare-live-checkpoint-engine.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/healthy-replay-checkpoint-wine11.json.br',import.meta.url))));

test('live checkpoint engine and filters retain exact original state through two healthy runs',()=>{
 const input=fixture(),report=compareLiveCheckpointEngine(input);
 assert.equal(report.frames,800);assert.equal(report.comparedStores,14400);
 assert.equal(report.comparedRandomStates,1600);assert.equal(report.differences,0);
 assert.deepEqual(report.passes.map(p=>[p.randomCalls,p.randomState]),[[4,1449997005],[4,1449997005]]);
 const row=input.rows[401],bytes=Buffer.from(row.engineHex,'hex');
 bytes.writeFloatLE(1234,0x15c);row.engineHex=bytes.toString('hex');
 const changed=compareLiveCheckpointEngine(input);
 assert.ok(changed.firstDifferences.some(d=>d.frame===200&&d.phase==='after-update'&&d.field==='rpmDemand'));
});

test('live checkpoint reads fail for absent rider/world state and corrupt captures',()=>{
 const {checkpoint}=fixture(),memory=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress;
 for(const offset of [0x874,0x8f4])assert.throws(()=>memory.read(memory.u32(bike+offset),4),/Missing checkpoint memory/);
 const copy=memory.read(bike,4);copy.fill(0);assert.equal(memory.u32(bike),0x4d9a94);
 const overlap=structuredClone(checkpoint);overlap.blocks.push({...overlap.blocks[0]});overlap.blockCount++;
 assert.throws(()=>checkpointMemory(overlap),/Overlapping/);
 const short=structuredClone(checkpoint);short.blocks[0].hex=short.blocks[0].hex.slice(2);
 assert.throws(()=>checkpointMemory(short),/Invalid checkpoint block/);
 const loaded=loadLiveEngine(checkpoint);
 assert.equal(loaded.engine.gearCount,5);assert.equal(loaded.engine.maxRpm,10250);
 assert.equal(loaded.engine.previousRpmDemand,memory.f32(loaded.address+0x7c));
 const missing=structuredClone(checkpoint),filter=memory.u32(loaded.address+4);
 missing.blocks=missing.blocks.filter(b=>b.address!==filter);missing.blockCount=missing.blocks.length;
 assert.throws(()=>loadLiveEngine(missing),/Missing checkpoint memory/);
});

test('live engine comparison rejects unsupported states and fabricated checkpoint initialization',()=>{
 for(const [offset,value] of [[0x844,1],[0x614,1],[0xc68,1],[0x6f8,0x3f800000]]){
  const input=fixture(),row=input.rows[20],b=Buffer.from(row.stateHex,'hex');b.writeUInt32LE(value,offset);row.stateHex=b.toString('hex');
  assert.throws(()=>compareLiveCheckpointEngine(input),offset===0x614?/Player identity differs/:/Unsupported live controller\/state/);
 }
 assert.throws(()=>compareLiveCheckpointEngine({...fixture(),executableSha256:'unknown'}),/Unsupported executable provenance/);
 const input=fixture(),block=input.checkpoint.blocks.find(b=>b.address===input.checkpoint.bikeAddress),bytes=Buffer.from(block.hex,'hex');bytes.writeFloatLE(42,0x510);block.hex=bytes.toString('hex');
 assert.throws(()=>compareLiveCheckpointEngine(input),/Checkpoint differs/);
});
