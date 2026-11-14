import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeDrawInputs} from '../scripts/mcm-reference/analyze-draw-inputs.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/draw-stateblock-inputs-wine11.json.br',import.meta.url))));
test('native draw arrays and stateblock boundaries identify the recurring scratch write',()=>{
 const draw=analyzeDrawInputs(fixture.draw),state=analyzeDrawInputs(fixture.stateblock);
 assert.equal(draw.calls,60);assert.equal(draw.changedCalls,60);assert.equal(draw.inputWordMatches,0);
 assert.deepEqual(draw.batches,{'12 vertices / 24 indices':20,'280 vertices / 894 indices':20,'247 vertices / 738 indices':20});
 assert.equal(state.calls,12);assert.equal(state.applyPairs,12);assert.equal(state.applyChanges,12);assert.equal(state.ignoredLeadingRows,59);
});
test('draw input validation rejects invalid geometry, returns and changing caller identity',()=>{
 const bad=structuredClone(fixture.draw);bad.find(r=>r.args).indicesHex='ffff'+bad.find(r=>r.args).indicesHex.slice(4);
 assert.throws(()=>analyzeDrawInputs(bad),/Index outside/);
 const cleanup=structuredClone(fixture.draw);cleanup.find(r=>r.phase==='at-00445f88').esp-=4;
 assert.throws(()=>analyzeDrawInputs(cleanup),/Invalid draw return/);
 const identity=structuredClone(fixture.stateblock);identity.find(r=>r.phase==='before-apply'&&r.scratchAddress).scratchAddress+=4;
 assert.throws(()=>analyzeDrawInputs(identity),/identity changed/);
 const last=fixture.draw.findLastIndex(r=>r.phase==='at-00445f88');assert.throws(()=>analyzeDrawInputs(fixture.draw.slice(0,last)),/Incomplete/);
});
