import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMcmInterpolatedAnimation} from '../src/physics/mcm/interpolated-animation-advance.js';
import {loadLiveAnimationAssets,loadLiveAnimationState} from '../scripts/mcm-reference/live-animation-assets.mjs';
import {seekMcmAnimation} from '../src/physics/mcm/animation-seek.js';
function fixture(){
 const record=Buffer.alloc(0x78),frame=Buffer.alloc(0x34),child=Buffer.alloc(0x30);
 record.writeUInt32LE(0x2000,0x68);record.writeUInt32LE(1,0x6c);record.writeUInt32LE(15,0x74);
 frame.writeUInt32LE(0x3000,0xc);frame.writeFloatLE(-2,0x1c);frame.writeFloatLE(3,0x28);
 child[0]=4;child.writeUInt32LE(1,4);child.writeFloatLE(1,0x10);child.writeFloatLE(1,0x18);
 return {schemaVersion:1,kind:'mcm-animation-observation',records:Array(21).fill(0x1000),blockCount:3,blocks:[record,frame,child].map((b,i)=>({address:(i+1)*0x1000,size:b.length,hex:b.toString('hex')}))};
}
const change=(input,index,offset,value)=>{const b=Buffer.from(input.blocks[index].hex,'hex');b.writeUInt32LE(value,offset);input.blocks[index].hex=b.toString('hex');};
test('live animation loader retains shared identity and feeds recovered seek',()=>{
 const loaded=loadLiveAnimationAssets(fixture());assert.equal(loaded.records[0],loaded.records[20]);
 const object={},seen=[];seekMcmAnimation(object,loaded.records[0],0,child=>seen.push(child));
 assert.equal(seen[0],loaded.children.get(0x3000));assert.equal(seen[0].componentIndex,4);
 assert.deepEqual(seen[0].forward,[0,0,1]);assert.deepEqual(seen[0].up,[0,1,0]);
 assert.deepEqual(object.boundsMin,[-2,0,0]);assert.deepEqual(object.boundsMax,[3,0,0]);assert.equal(object.frame.token,0x2000);
});
test('live animation loader rejects cycles, absent pointers and inconsistent lengths',()=>{
 for(const [index,offset,value,pattern] of [[2,0x2c,0x3000,/Cyclic/],[0,0x68,0x4000,/block type/],[0,0x6c,2,/Short/],[1,0,1,/index differs/],[1,0x18,0x2000,/Long/]]){
  const input=fixture();change(input,index,offset,value);assert.throws(()=>loadLiveAnimationAssets(input),pattern);
 }
 const input=fixture();input.blocks.push({address:0x4000,size:4,hex:'00000000'});input.blockCount++;
 assert.throws(()=>loadLiveAnimationAssets(input),/Unreferenced/);
});

test('inactive unreadable previous-frame bits survive bootstrap and reject dereference',()=>{
 const observation=fixture(),token=0x3e31d0c8;
 observation.retainedFrames=[0,0,0,0,token,0];observation.boundsFrames=[0,0];
 observation.unreadableRetainedFrames=[{index:4,token}];
 const assets=loadLiveAnimationAssets(observation),values=new Map([[4,1],[0x1c,token]]);
 const memory={u32:offset=>values.get(offset)??0,f32:()=>0};
 const state=loadLiveAnimationState(memory,0,assets);
 assert.equal(state.previousFrame.token,token);
 assert.throws(()=>state.previousFrame.firstChild,/dereferenced/);
 values.set(0x2c,1);assert.throws(()=>loadLiveAnimationState(memory,0,assets),/required by active/);values.set(0x2c,0);
 state.stopped=0;state.record=assets.records[0];state.frame=state.record.firstFrame;state.record.loop=1;
 advanceMcmInterpolatedAnimation(state,.02,()=>{});assert.equal(state.previousFrame,null);
 const invalid=structuredClone(observation);invalid.unreadableRetainedFrames[0].index=3;
 assert.throws(()=>loadLiveAnimationAssets(invalid),/Invalid unreadable/);
 const missing=structuredClone(observation);delete missing.unreadableRetainedFrames;
 assert.throws(()=>loadLiveAnimationAssets(missing),/Wrong animation block type/);
});
