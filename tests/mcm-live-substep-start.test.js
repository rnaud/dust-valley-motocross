import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {checkpointMemory,loadLiveVisuals} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {loadLiveSubstepStart} from '../scripts/mcm-reference/live-substep-start.mjs';
import {compareLiveSubstepStart} from '../scripts/mcm-reference/compare-live-substep-start.mjs';
import {beginMcmSubstep} from '../src/physics/mcm/contact-preparation.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-substep-start-wine11.json.br',import.meta.url))));
test('live engine and suspension preparation match all local original memory stores',()=>{
 const {checkpoint,outputHex}=fixture(),output=Buffer.from(outputHex,'hex'),report=compareLiveSubstepStart(checkpoint,null,output);
 assert.equal(report.differences,0);assert.equal(report.changedWords,16);assert.equal(report.blocks,41);assert.equal(report.randomCalls,0);
 output[0x504]^=1;assert.ok(compareLiveSubstepStart(checkpoint,null,output).differences>0);
});
test('live suspension preparation shares captured graphs and preserves rear rest transform',()=>{
 const {checkpoint}=fixture(),visuals=loadLiveVisuals(checkpoint),m=checkpointMemory(checkpoint),loaded=loadLiveSubstepStart(checkpoint,{visuals});
 assert.equal(loaded.visuals,visuals);
 const s=loaded.context.suspension;
 assert.equal(s.front.node,visuals.nodes.get(m.u32(loaded.frontAddress)));assert.equal(s.rear.node,visuals.nodes.get(m.u32(loaded.rearAddress)));
 const rest=[...s.rear.restLocal];beginMcmSubstep(loaded.context);
 assert.deepEqual(s.front.node.local.slice(12,15),[0,0,0]);assert.deepEqual(s.rear.node.local,rest);
 assert.equal(s.front.limited,0);assert.equal(s.rear.limited,0);
});
test('live substep initializer rejects missing suspension memory and unsupported controllers',()=>{
 const {checkpoint}=fixture(),m=checkpointMemory(checkpoint),address=m.u32(checkpoint.bikeAddress+0x8e8);
 const missing=structuredClone(checkpoint);missing.blocks=missing.blocks.filter(b=>b.address!==address);missing.blockCount--;
 assert.throws(()=>loadLiveSubstepStart(missing),/Missing checkpoint memory/);
 const b=checkpoint.blocks.find(b=>b.address===checkpoint.bikeAddress),bytes=Buffer.from(b.hex,'hex');bytes.writeUInt32LE(1,0x614);b.hex=bytes.toString('hex');
 assert.throws(()=>loadLiveSubstepStart(checkpoint),/Unsupported live substep/);
 assert.throws(()=>loadLiveSubstepStart(fixture().checkpoint,{dt:0}),/interval/);
});
