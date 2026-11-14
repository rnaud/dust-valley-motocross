import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveFrameActions} from '../scripts/mcm-reference/compare-live-frame-actions.mjs';
import {loadLiveFrameEnvironment} from '../scripts/mcm-reference/live-frame-environment.mjs';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-frame-actions-wine11.json.br',import.meta.url))));
test('captured and modified logical action lookups match original execution without memory changes',()=>{
 const {checkpoint,cases}=fixture();
 for(const c of cases){const r=compareLiveFrameActions(checkpoint,c.observation,Buffer.from(c.outputHex,'hex'));
  assert.equal(r.differences,0,c.name);assert.equal(r.changedWords,0,c.name);assert.ok(r.comparedWords>=3750);
  assert.equal(r.actions[8],+['all-keyboard-pressed','secondary-event','both-event'].includes(c.name));
 }
 const pressed=loadLiveFrameEnvironment(checkpoint,cases[1].observation).actions;
 assert.deepEqual(Object.values(pressed),[1,1,1,1,1,1]);
});
test('logical action capture rejects missing state, unsupported routing and output corruption',()=>{
 const {checkpoint,cases}=fixture(),base=cases[0],controller=checkpointMemory(checkpoint).u32(checkpoint.bikeAddress+0x6e4);
 const missing=structuredClone(base.observation);missing.blocks=missing.blocks.filter(b=>b.address!==controller+0x10);missing.blockCount=missing.blocks.length;
 assert.throws(()=>loadLiveFrameEnvironment(checkpoint,missing));
 const joystick=structuredClone(base.observation);joystick.blocks.find(b=>b.address===controller+0x10).hex='01000000';
 assert.throws(()=>loadLiveFrameEnvironment(checkpoint,joystick),/joystick/);
 const bad=Buffer.from(base.outputHex,'hex');bad.writeUInt32LE(1,16);
 assert.equal(compareLiveFrameActions(checkpoint,base.observation,bad).differences,1);
});
