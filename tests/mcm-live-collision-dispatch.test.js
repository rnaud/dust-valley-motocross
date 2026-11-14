import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {loadLiveCollisionDispatch} from '../scripts/mcm-reference/live-collision-dispatch.mjs';
import {compareLiveCollisionDispatch} from '../scripts/mcm-reference/compare-live-collision-dispatch.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-collision-dispatch-wine11.json.br',import.meta.url))));
const write=(o,a,v)=>{const b=o.blocks.find(b=>a>=b.address&&a+4<=b.address+b.size),bytes=Buffer.from(b.hex,'hex');bytes.writeUInt32LE(v,a-b.address);b.hex=bytes.toString('hex');};
test('live contact dispatch matches original changes and stops before actor response',()=>{
 const {checkpoint,observation,outputHex}=fixture(),output=Buffer.from(outputHex,'hex'),r=compareLiveCollisionDispatch(checkpoint,observation,output);
 assert.equal(r.differences,0);assert.equal(r.comparedWords,30743);assert.equal(r.changedWords,29);assert.equal(r.stoppedAtCallback,true);assert.equal(r.callbackOwner,checkpoint.bikeAddress);assert.equal(r.callbackKind,0);assert.equal(r.dispatched,1);
 output[8]^=1;assert.equal(compareLiveCollisionDispatch(checkpoint,observation,output).differences,1);
});
test('contact snapshot retains both bikes, their riders and shared collision identities',()=>{
 const {checkpoint,observation}=fixture(),w=loadLiveCollisionDispatch(checkpoint,observation);
 assert.equal(checkpoint.playerFrame,120);assert.equal(observation.captureBoundary,'collision-before-primary');assert.equal(w.dispatch.currentA,1);assert.equal(w.dispatch.currentB,0);assert.equal(w.dispatch.depth,.4921875);assert.equal(w.actors.size,4);
 for(const a of w.actors.values())if(a.kind==='bike'){assert.equal(a.rider.bike,a);assert.equal(a.collision.ownerAddress,a.address);assert.equal(a.rider.collision.ownerAddress,a.rider.address);}
 assert.equal(w.objects[1].other,w.objects[0]);
 // Original 0x49dc34..0x49dd1f selects +58/+64 with both flags clear,
 // and +70/+7c when either rider flag is set.
 for(const a of w.actors.values())if(a.kind==='rider')for(const [key,offset] of [['velocity',0x58],['angular',0x64],['alternateVelocity',0x70],['alternateAngular',0x7c]])assert.deepEqual(a[key],[0,4,8].map(i=>w.memory.f32(a.address+offset+i)));
});
test('dispatch capture rejects mixed frames, missing actors and broken owner links',()=>{
 const a=fixture();a.observation.playerFrame++;assert.throws(()=>loadLiveCollisionDispatch(a.checkpoint,a.observation),/boundary/);
 const b=fixture();b.observation.actorsCaptured=false;assert.throws(()=>loadLiveCollisionDispatch(b.checkpoint,b.observation),/actor capture/);
 const c=fixture(),w=loadLiveCollisionDispatch(c.checkpoint,c.observation),other=w.objects[3].ownerAddress;write(c.observation,other+0x15c,c.checkpoint.bikeAddress);assert.throws(()=>loadLiveCollisionDispatch(c.checkpoint,c.observation),/rider owner/);
 const d=fixture(),x=loadLiveCollisionDispatch(d.checkpoint,d.observation);write(d.observation,x.objects[2].ownerAddress+0xc88,0);assert.throws(()=>loadLiveCollisionDispatch(d.checkpoint,d.observation),/back-reference/);
});
