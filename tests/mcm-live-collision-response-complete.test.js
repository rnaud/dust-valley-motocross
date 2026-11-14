import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareLiveCollisionResponse} from '../scripts/mcm-reference/compare-live-collision-response.mjs';
import {loadLiveCollisionDispatch} from '../scripts/mcm-reference/live-collision-dispatch.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-collision-response-complete-wine11.json.br',import.meta.url))));
test('complete captured crash response matches original notification return and grid refresh',()=>{
 const {checkpoint,observation,outputHex}=fixture(),output=Buffer.from(outputHex,'hex'),r=compareLiveCollisionResponse(checkpoint,observation,output,{complete:true});
 assert.equal(r.differences,0);assert.equal(r.comparedWords,35366);assert.equal(r.changedWords,24);assert.deepEqual(r.boundary,[1,1,1]);
 const world=loadLiveCollisionDispatch(checkpoint,observation),bike=world.actors.get(checkpoint.bikeAddress);assert.equal(bike.notification.player,bike.address);assert.equal(bike.state844,1);
 // Mutation after the old stopping point: speed is recomputed before return.
 let at=12;for(const b of observation.blocks){if(b.address===bike.address){output[at+0x6a4]^=1;break;}at+=b.size;}
 assert.equal(compareLiveCollisionResponse(checkpoint,observation,output,{complete:true}).differences,1);
});
test('complete response requires observed notification gates and rejects active-player state',()=>{
 const a=fixture();a.observation.notificationGatesCaptured=false;assert.throws(()=>compareLiveCollisionResponse(a.checkpoint,a.observation,Buffer.from(a.outputHex,'hex'),{complete:true}),/Unreferenced|notification gate/);
 const b=fixture();for(const data of [b.checkpoint,b.observation]){const block=data.blocks.find(x=>x.address===b.checkpoint.bikeAddress),bytes=Buffer.from(block.hex,'hex');bytes.writeUInt32LE(0,0x844);block.hex=bytes.toString('hex');}assert.throws(()=>compareLiveCollisionResponse(b.checkpoint,b.observation,Buffer.from(b.outputHex,'hex'),{complete:true}),/crashed-player/);
 const c=fixture(),w=loadLiveCollisionDispatch(c.checkpoint,c.observation),address=w.actors.get(c.checkpoint.bikeAddress).notification.world+0x1ec;c.observation.blocks=c.observation.blocks.filter(b=>b.address!==address);c.observation.blockCount--;assert.throws(()=>loadLiveCollisionDispatch(c.checkpoint,c.observation),/Missing|Uncaptured/);
});
