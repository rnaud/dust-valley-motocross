import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareLiveCollisionResponse} from '../scripts/mcm-reference/compare-live-collision-response.mjs';
import {loadLiveCollisionDispatch} from '../scripts/mcm-reference/live-collision-dispatch.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-collision-response-wine11.json.br',import.meta.url))));
test('captured live impulse response matches original until notification',()=>{
 const {checkpoint,observation,outputHex}=fixture(),output=Buffer.from(outputHex,'hex'),r=compareLiveCollisionResponse(checkpoint,observation,output);
 assert.equal(r.differences,0);assert.equal(r.comparedWords,35363);assert.equal(r.changedWords,18);assert.deepEqual(r.boundary,[1,1108965725,1]);
 output[4]^=1;assert.equal(compareLiveCollisionResponse(checkpoint,observation,output).differences,1);
});
test('both captured actor transform graphs preserve shared node identity',()=>{
 const {checkpoint,observation}=fixture(),w=loadLiveCollisionDispatch(checkpoint,observation);
 assert.equal(w.transformNodes.size,48);assert.equal(w.actors.size,4);
 for(const a of w.actors.values())if(a.kind==='bike'){assert.equal(a.transform,w.transformNodes.get(a.transformAddress));assert.equal(a.riderTransform,a.proxy.bodyNode);assert.equal(a.riderTransform,w.transformNodes.get(a.riderTransform.address));}
});
test('live response rejects absent transform dependencies and mixed observations',()=>{
 const a=fixture();a.observation.transformsCaptured=false;assert.throws(()=>compareLiveCollisionResponse(a.checkpoint,a.observation,Buffer.from(a.outputHex,'hex')),/transforms required/);
 const b=fixture(),w=loadLiveCollisionDispatch(b.checkpoint,b.observation),other=[...w.actors.values()].find(a=>a.kind==='bike'&&a.address!==b.checkpoint.bikeAddress);b.observation.blocks=b.observation.blocks.filter(b=>b.address!==other.transformAddress);b.observation.blockCount--;assert.throws(()=>loadLiveCollisionDispatch(b.checkpoint,b.observation),/Missing|Uncaptured/);
 const c=fixture();c.observation.captureId='wrong';assert.throws(()=>loadLiveCollisionDispatch(c.checkpoint,c.observation),/boundary/);
});
