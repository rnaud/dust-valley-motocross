import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareBikeReplay} from '../scripts/mcm-reference/compare-bike.mjs';
import {compareRiderTiming} from '../scripts/mcm-reference/compare-rider-timing.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/rider-fixed-replay-wine11.json.br',import.meta.url))));
test('fixed player rider timing preserves replay motion and rider state through crashes',()=>{
 const {rows}=fixture(),r=compareBikeReplay(rows);
 assert.equal(r.framesPerPass,400);assert.equal(r.firstMotionDifference,null);
 assert.deepEqual(r.randomStateDifferences,[]);assert.deepEqual(r.differingRiderWords,{});assert.deepEqual(r.differingEngineWords,{});
 assert.deepEqual(Object.keys(r.differingBikeWords),['0x488','0x48c','0x490','0x494']);
 assert.deepEqual(r.riderTiming.differences,[]);
 assert.deepEqual(r.riderTiming.passes,[0,1].map(()=>({updates:399,updatesDuringBike:0,intervalBits:[0x3ca3d70a]})));
 for(const pass of [0,1])assert.ok(rows.some(r=>r.pass===pass&&Buffer.from(r.stateHex,'hex').readUInt32LE(0x844)));
 assert.ok(Object.keys(r.differingStackWords).length>0);
});
test('timing comparison rejects missing observations and invalid controlled intervals',()=>{
 const {rows}=fixture();delete rows[1].riderDtBits;assert.throws(()=>compareRiderTiming(rows),/Missing rider/);
 const next=fixture().rows;next[2].riderDtBits=0;assert.throws(()=>compareRiderTiming(next),/interval differs/);
 const mixed=fixture().rows;mixed[2].fixedRider=false;assert.throws(()=>compareRiderTiming(mixed),/Mixed rider/);
});
test('rider count alignment exposes extra calls between bike updates',()=>{
 const {rows}=fixture();for(const r of rows)if(r.pass===1&&r.playerFrame>=10)r.riderUpdateCount++;
 const r=compareRiderTiming(rows);assert.equal(r.differences[0].frame,10);assert.equal(r.differences[0].countA,10);assert.equal(r.differences[0].countB,11);
 const regressed=fixture().rows;regressed[4].riderUpdateCount=0;assert.throws(()=>compareRiderTiming(regressed),/regressed/);
});
