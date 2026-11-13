import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareBikeReplay} from '../scripts/mcm-reference/compare-bike.mjs';
import {decodeRiderCollision} from '../scripts/mcm-reference/compare-rider-collision.mjs';
import {bindRiderCollisionCallbacks} from '../scripts/mcm-reference/live-rider-collision.mjs';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/rider-collision-replays-wine11.json.br',import.meta.url))));
test('original collision observations expose stale callbacks and pair flags at replay entry',()=>{
 const {observed,callback}=fixture(),r=compareBikeReplay(observed.rows),s=compareBikeReplay(callback.rows);
 assert.equal(r.riderCollision.differences['state+0x108'].frame,0);assert.equal(r.riderCollision.differences['pairRow+0x0'].frame,0);
 assert.equal(r.firstMotionDifference.frame,55);assert.equal(s.firstMotionDifference.frame,55);
 assert.ok(s.riderCollision.differences['state+0x108'].frame>0);
 assert.equal(s.riderCollision.differences['pairRow+0x0'].frame,0);
});
test('callback and pair binding copies only matching observed state and preserves linked graph bytes',()=>{
 const {observed,callback,pairs}=fixture(),row=observed.rows[0],c=decodeRiderCollision(row);
 const bound=bindRiderCollisionCallbacks(observed.checkpoint,row),both=bindRiderCollisionCallbacks(observed.checkpoint,row,{pairs:true});
 assert.deepEqual(bound.blocks,callback.checkpoint.blocks);assert.deepEqual(both.blocks,pairs.checkpoint.blocks);
 assert.equal(bound.blockCount,43);assert.equal(both.blockCount,103);
 const m=checkpointMemory(both);assert.equal(m.read(c.address+0x108,8).toString('hex'),c.state.subarray(0x108).toString('hex'));
 for(let i=0;i<60;i++){assert.equal(m.u32(c.managerAddress+0xf8+(c.id*60+i)*4),c.pairRow.readUInt32LE(i*4));assert.equal(m.u32(c.managerAddress+0xf8+(i*60+c.id)*4),c.pairColumn.readUInt32LE(i*4));}
 assert.throws(()=>m.read(c.entriesAddress,1),/Missing checkpoint/);
 assert.throws(()=>bindRiderCollisionCallbacks(observed.checkpoint,observed.rows[1]),/boundary/);
});
test('collision decoding rejects missing observations, inconsistent ownership and malformed entry arrays',()=>{
 const row=fixture().observed.rows[0];assert.throws(()=>decodeRiderCollision({...row,riderCollision:undefined}),/Missing rider/);
 const altered=structuredClone(row);altered.riderCollision.address++;assert.throws(()=>decodeRiderCollision(altered),/ownership/);
 const short=structuredClone(row);short.riderCollision.entriesHex=short.riderCollision.entriesHex.slice(2);assert.throws(()=>decodeRiderCollision(short),/bytes/);
 const diagonal=structuredClone(row),c=decodeRiderCollision(row),b=Buffer.from(diagonal.riderCollision.pairColumnHex,'hex');b[c.id*4]^=1;diagonal.riderCollision.pairColumnHex=b.toString('hex');assert.throws(()=>decodeRiderCollision(diagonal),/diagonal/);
});
test('restored callbacks and pair flags retain repeatable motion without hiding other differences',()=>{
 const {pairs}=fixture(),r=compareBikeReplay(pairs.rows);
 assert.equal(r.firstMotionDifference,null);assert.deepEqual(r.differingEngineWords,{});assert.deepEqual(r.differingRiderWords,{});assert.deepEqual(r.randomStateDifferences,[]);
 assert.deepEqual(Object.keys(r.differingBikeWords),['0x488','0x48c','0x490','0x494']);
 assert.equal(r.riderCollision.differences['state+0x108'],undefined);assert.equal(r.riderCollision.differences['state+0x10c'],undefined);
 assert.equal(r.riderCollision.differences['pairRow+0x0'],undefined);assert.equal(r.riderCollision.differences['pairColumn+0x0'],undefined);
 assert.ok(Object.keys(r.riderCollision.differences).length>0);assert.ok(Object.keys(r.differingStackWords).length>0);
 for(const pass of [0,1]){const row=pairs.rows.find(r=>r.pass===pass);assert.equal(row.phase,'before-update');assert.equal(row.playerFrame,0);}
});
