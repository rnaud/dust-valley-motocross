import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareLiveOrderedDispatch} from '../scripts/mcm-reference/compare-live-ordered-dispatch.mjs';
import {loadLiveOrderedDispatch} from '../scripts/mcm-reference/live-ordered-dispatch.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-ordered-dispatch-wine11.json.br',import.meta.url))));
test('live ordered rider-primary and bike-secondary dispatch matches original',()=>{
 const {captured:c}=fixture(),output=Buffer.from(c.outputHex,'hex'),r=compareLiveOrderedDispatch(c.checkpoint,c.observation,output);
 assert.equal(r.differences,0);assert.equal(r.comparedWords,35635);assert.equal(r.changedWords,42);assert.deepEqual(r.callbackTrace,[[0x51dd630,2],[c.checkpoint.bikeAddress,1]]);
 output[8]^=1;assert.equal(compareLiveOrderedDispatch(c.checkpoint,c.observation,output).differences,1);
 const w=loadLiveOrderedDispatch(c.checkpoint,c.observation),bike=w.actors.get(c.checkpoint.bikeAddress);assert.equal(bike.rider.bike,bike);assert.equal(bike.riderTransform,w.transformNodes.get(bike.riderTransform.address));assert.equal(w.tag,null);
});
test('reversed order and suppression variants match native callback traces and memory',()=>{
 const {variants}=fixture();assert.equal(variants.length,4);
 const results=variants.map(c=>compareLiveOrderedDispatch(c.checkpoint,c.observation,Buffer.from(c.outputHex,'hex')));
 results.forEach((r,i)=>assert.equal(r.differences,0,variants[i].name));assert.deepEqual(results.map(r=>r.changedWords),[53,22,22,41]);assert.deepEqual(results[0].callbackTrace.map(x=>x[1]),[0,3]);
});
test('ordered dispatch requires observed gates and rejects unsupported callbacks',()=>{
 const {captured:c}=fixture();c.observation.bikeCallbackGatesCaptured=false;assert.throws(()=>loadLiveOrderedDispatch(c.checkpoint,c.observation),/dependencies/);
 const {captured:d}=fixture(),w=loadLiveOrderedDispatch(d.checkpoint,d.observation);assert.throws(()=>w.objects[3].onPrimary(),/Unsupported live callback/);
 const {captured:e}=fixture();e.observation.blocks=e.observation.blocks.filter(b=>b.address!==0x508270);e.observation.blockCount--;assert.throws(()=>loadLiveOrderedDispatch(e.checkpoint,e.observation),/Missing|Uncaptured/);
});
