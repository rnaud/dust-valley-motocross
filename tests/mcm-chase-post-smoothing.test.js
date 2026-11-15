import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChasePostSmoothing} from '../scripts/mcm-reference/compare-chase-post-smoothing.mjs';
import {analyzeLiveChaseController} from '../scripts/mcm-reference/analyze-live-chase-controller.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-post-smoothing-wine11.json.br',import.meta.url))));
test('post-smoothing filter reset and target/eye override match 864 native cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChasePostSmoothing(input,output),{cases:864,words:27648,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChasePostSmoothing(input,output).differences,1);
 assert.throws(()=>compareChasePostSmoothing(input,output.subarray(0,-1)),/Incomplete/);
});
test('60 native frames retain controller state through the post-smoothing boundary',()=>{
 assert.deepEqual(analyzeLiveChaseController(fixture.live,{postSmoothing:true}),{pairs:60,downstreamWords:3120,spatialWords:720,retainedTargetChecks:60,active:60,bypassed:0,resets:0,modes:[0],postWords:1920});
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,9);
 const entries=fixture.live.filter(r=>r.phase==='after');assert.ok(entries.every(r=>r.inputs[28]===0&&r.inputs[75]===999),'Live coverage is pass-through, not a mode reset');
});
test('post-smoothing comparison rejects wrong outputs, flags, retained modes and missing stages',()=>{
 for(const [field,index,pattern] of [['result',0,/output differs/],['result',3,/output differs/],['filters',1,/filters differ/],['inputs',28,/camera differs/],['inputs',75,/mode differs/]]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase==='post');r[field][index]=(r[field][index]^1)>>>0;
  assert.throws(()=>analyzeLiveChaseController(rows,{postSmoothing:true}),pattern);
 }
 const rows=structuredClone(fixture.live),r=rows.filter(r=>r.phase==='source-entry')[1];r.inputs[75]^=1;
 assert.throws(()=>analyzeLiveChaseController(rows,{postSmoothing:true}),/Retained previous mode differs/);
 assert.throws(()=>analyzeLiveChaseController(fixture.live.slice(0,-1),{postSmoothing:true}),/Incomplete/);
});
