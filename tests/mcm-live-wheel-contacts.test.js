import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {decodeFrameStack} from '../scripts/mcm-reference/decode-frame-stack.mjs';
import {compareBikeReplay} from '../scripts/mcm-reference/compare-bike.mjs';
import {checkpointMemory,loadLiveVisuals} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {loadLiveWheelContacts} from '../scripts/mcm-reference/live-wheel-contacts.mjs';
import {loadLiveSubstepStart} from '../scripts/mcm-reference/live-substep-start.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/contact-stack-replay-wine11.json.br',import.meta.url))));
// Geometry is deliberately only a loader stub; these tests do not claim terrain parity.
const terrain={root:{},heightScale:1,worldToGrid:1};
const options={dt:.02,componentRate:0};
test('captured caller stack preserves bytes and rejects inconsistent boundary metadata',()=>{
 const row=fixture.rows[0],stack=decodeFrameStack(row);
 assert.equal(stack.bytes.toString('hex'),row.stackHex);
 for(let i=0;i<stack.points.length;i++)for(let j=0;j<3;j++)assert.ok(Object.is(stack.points[i][j],stack.bytes.readFloatLE(stack.pointOffsets[i]+4*j)));
 assert.throws(()=>decodeFrameStack({...row,steps:row.steps+1}),/metadata/);
 assert.throws(()=>decodeFrameStack({...row,stackHex:row.stackHex.slice(2)}),/frame stack/);
 assert.throws(()=>decodeFrameStack({...row,stackAddress:'fffffff0'}),/range/);
});
test('replay comparison exposes unrestored stack differences and rejects missing observations',()=>{
 const report=compareBikeReplay(fixture.rows);
 assert.equal(report.comparedBoundaryPairs,800);
 assert.equal(report.firstMotionDifference.frame,111);
 assert.deepEqual(report.randomStateDifferences[0],{frame:230,phase:'after-update',a:3681394607,b:2529458780});
 assert.ok(Object.keys(report.differingStackWords).length>0);
 const rows=fixture.rows.map(r=>({...r}));delete rows[0].stackHex;
 assert.throws(()=>compareBikeReplay(rows),/frame stack/);
 // Build two identical boundaries to isolate detection of a single changed stack word.
 const pair=[{...fixture.rows[0],sequence:0,pass:0},{...fixture.rows[1],sequence:1,pass:0},
 {...fixture.rows[0],sequence:2,pass:1},{...fixture.rows[1],sequence:3,pass:1}];
 assert.deepEqual(compareBikeReplay(pair).differingStackWords,{});
 const bytes=Buffer.from(pair[2].stackHex,'hex');bytes[0]^=1;pair[2].stackHex=bytes.toString('hex');
 assert.deepEqual(Object.keys(compareBikeReplay(pair).differingStackWords),['0x0']);
});
test('live contact initialization loads separate physics node and shares preparation graph',()=>{
 const {checkpoint,rows}=fixture,m=checkpointMemory(checkpoint);
 const loaded=loadLiveWheelContacts(checkpoint,rows[0],terrain,options);
 assert.equal(loaded.visuals.nodes.size,25);
 assert.equal(loaded.context.node,loaded.visuals.nodes.get(m.u32(loaded.componentAddress+0x50)));
 const start=loadLiveSubstepStart(checkpoint,{visuals:loaded.visuals});
 assert.equal(start.visuals,loaded.visuals);
 assert.throws(()=>[...loaded.context.resampleNormal],/Uncaptured nested normal/);
 assert.throws(()=>loadLiveWheelContacts(checkpoint,rows[0],terrain,{...options,visuals:loadLiveVisuals(checkpoint)}),/node missing/);
 assert.throws(()=>loadLiveWheelContacts(checkpoint,rows[1],terrain,options),/boundary/);
 assert.throws(()=>loadLiveWheelContacts(checkpoint,rows[0],terrain),/timing/);
 const missing=structuredClone(checkpoint),address=m.u32(loaded.componentAddress+0x50);
 missing.blocks=missing.blocks.filter(b=>b.address!==address);missing.blockCount--;
 assert.throws(()=>loadLiveWheelContacts(missing,rows[0],terrain,options),/Missing checkpoint memory/);
});
