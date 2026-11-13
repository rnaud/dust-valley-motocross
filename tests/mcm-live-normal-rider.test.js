import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {loadLiveNormalRider} from '../scripts/mcm-reference/live-normal-rider.mjs';
import {encodeLiveNormalRiderInput,compareLiveNormalRider} from '../scripts/mcm-reference/compare-live-normal-rider.mjs';
const put=(c,address,value)=>{const b=c.blocks.find(b=>address>=b.address&&address+4<=b.address+b.size),bytes=Buffer.from(b.hex,'hex');bytes.writeUInt32LE(value,address-b.address);b.hex=bytes.toString('hex');};
function fixture(){
 const {checkpoint:c}=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/visual-replay-checkpoint-wine11.json.br',import.meta.url))));
 c.captureId='0123456789abcdef';c.captureBoundary='player-frame-entry';
 const record=0x7000000,frame=record+0x100,r=Buffer.alloc(0x78),f=Buffer.alloc(0x34);
 r.writeUInt32LE(frame,0x68);r.writeUInt32LE(1,0x6c);r.writeUInt32LE(15,0x74);
 for(let i=0;i<21;i++)put(c,c.bikeAddress+0x740+i*4,record);
 const proxy=checkpointMemory(c).u32(c.bikeAddress+0xc8c);
 for(const p of [c.bikeAddress,proxy]){put(c,p+0x10,record);put(c,p+0x14,frame);}
 const a={schemaVersion:1,kind:'mcm-animation-observation',captureId:c.captureId,captureBoundary:c.captureBoundary,bikeAddress:c.bikeAddress,records:Array(21).fill(record),blockCount:2,blocks:[{address:record,size:r.length,hex:r.toString('hex')},{address:frame,size:f.length,hex:f.toString('hex')}]};
 return {c,a};
}
test('normal rider initialization joins captured graph identity with explicit synthetic animation resources',()=>{
 const {c,a}=fixture(),loaded=loadLiveNormalRider(c,a);
 assert.equal(loaded.context.bodyNode,loaded.visuals.bike.bodyNode);
 assert.equal(loaded.context.riderAnimation.record,loaded.assets.records[0]);
 assert.equal(loaded.context.bikeAnimation.frame,loaded.assets.records[0].firstFrame);
 const input=encodeLiveNormalRiderInput(c,a);assert.equal(input.readUInt32LE(),c.bikeAddress);assert.equal(input.readUInt32LE(4),43);
});
test('normal rider loader rejects mixed captures, stale tables and unsupported states',()=>{
 for(const mutate of [({a})=>delete a.captureId,({a})=>a.captureId='fedcba9876543210',({a})=>a.captureBoundary='uncontrolled']){
  const pair=fixture();mutate(pair);assert.throws(()=>loadLiveNormalRider(pair.c,pair.a),/boundary differs/);
 }
 const {c,a}=fixture();a.records[3]++;assert.throws(()=>loadLiveNormalRider(c,a),/table differs/);a.records[3]--;
 put(c,c.bikeAddress+0x710,1);assert.throws(()=>loadLiveNormalRider(c,a),/Unsupported normal rider state/);
});
test('normal rider comparison rejects truncated output and reports omitted original stores',()=>{
 const {c,a}=fixture();assert.throws(()=>compareLiveNormalRider(c,a,Buffer.alloc(0)),/output size/);
 const unchanged=Buffer.concat([...c.blocks,...a.blocks].map(b=>Buffer.from(b.hex,'hex'))),report=compareLiveNormalRider(c,a,unchanged);
 assert.ok(report.differences>0);assert.equal(report.comparedWords,unchanged.length/4);
});
