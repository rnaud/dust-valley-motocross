import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveFrameEnvironment} from '../scripts/mcm-reference/live-frame-environment.mjs';
import {encodeLiveFrameResetInput,compareLiveFrameReset} from '../scripts/mcm-reference/compare-live-frame-reset.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-frame-reset-wine11.json.br',import.meta.url))));
test('captured frame environment loads original mode, scale and reset action',()=>{
 const {captured:c}=fixture(),e=loadLiveFrameEnvironment(c.checkpoint,c.observation);
 assert.equal(e.resetDecision.setting,0);assert.equal(e.resetDecision.mode,0);assert.equal(e.resetDecision.worldScale,3);
 assert.equal(e.resetDecision.controllerPresent,true);assert.equal(e.resetAction,0);assert.equal(e.resetDecision.queryReset(),false);
 assert.equal(encodeLiveFrameResetInput(c.checkpoint,c.observation).readUInt32LE(4),48);
 const r=compareLiveFrameReset(c.checkpoint,c.observation,Buffer.from(c.outputHex,'hex'));
 assert.equal(r.comparedWords,3713);assert.equal(r.queries,1);assert.equal(r.branch,'continue');assert.equal(r.differences,0);
});
test('captured-state variants match original action equality and reset branches',()=>{
 const {variants}=fixture(),branches=['button','continue','continue','elapsed','boundary','continue','boundary'];
 assert.equal(variants.length,branches.length);
 for(const [i,v] of variants.entries()){
  const r=compareLiveFrameReset(v.checkpoint,v.observation,Buffer.from(v.outputHex,'hex'));
  assert.equal(r.branch,branches[i],v.name);assert.equal(r.differences,0,v.name);assert.equal(r.comparedWords,3713);
  if(['pressed','boundary','mode-two'].includes(v.name))assert.ok(r.changedWords>=2);
 }
});
test('frame environment rejects mixed snapshots and missing settings or action memory',()=>{
 const {captured:c}=fixture();
 const mixed=structuredClone(c.observation);mixed.playerFrame++;
 assert.throws(()=>loadLiveFrameEnvironment(c.checkpoint,mixed),/boundary differs/);
 for(const index of [1,4]){const missing=structuredClone(c.observation);missing.blocks.splice(index,1);missing.blockCount--;
  assert.throws(()=>loadLiveFrameEnvironment(c.checkpoint,missing),/Missing checkpoint memory/);
 }
 assert.throws(()=>compareLiveFrameReset(c.checkpoint,c.observation,Buffer.alloc(4)),/output size/);
});
