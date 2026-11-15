import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareCameraSubmission} from '../scripts/mcm-reference/compare-camera-submission.mjs';
import {analyzeCameraSubmission} from '../scripts/mcm-reference/analyze-camera-submission.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/camera-submission-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('submission clip restoration matches 4096 intact native calls',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');assert.deepEqual(compareCameraSubmission(input,output),{cases:4096,words:274432,rebuilt:2048,differences:0,examples:[]});output[260]^=1;assert.equal(compareCameraSubmission(input,output).differences,1);assert.throws(()=>compareCameraSubmission(input,output.subarray(0,-1)),/Incomplete/);
});
test('computed camera predicts graphics submissions, exact scratch stores and later bike entries',()=>{
 const t=loadTerrain('quarries-dunes'),r=analyzeCameraSubmission(fixture.live,t);assert.equal(r.chain.pairs,60);assert.equal(r.chain.refreshCounterBoundaryInputs,0);assert.deepEqual({...r,chain:undefined},{chain:undefined,submissions:59,submissionWords:1888,products:59,productWords:944,stores:59,bikeCarryChecks:58,submissionScratchChanges:0});
 assert.deepEqual([...new Set(fixture.live.filter(r=>r.phase==='controls-entry').map(r=>r.inputs[64]))],[0]);assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,22);
 for(const [phase,index,pattern] of [['submit-view',2,/Submitted computed matrix differs/],['submit-projection',10,/Submitted computed matrix differs/],['product-before',16,/nonidentity render world/],['product-after',2,/Computed renderer product differs/]]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase===phase);r.words[index]=(r.words[index]^1)>>>0;assert.throws(()=>analyzeCameraSubmission(rows,t),pattern);
 }
 for(const [phase,pattern] of [['scratch-store',/Computed renderer scratch store differs/],['bike-entry',/Later writer changed physics entry scratch/]]){
  const rows=structuredClone(fixture.live),r=rows.filter(r=>r.phase===phase)[1];r.scratchBits=(r.scratchBits^1)>>>0;assert.throws(()=>analyzeCameraSubmission(rows,t),pattern);
 }
 const rows=structuredClone(fixture.live);rows.find(r=>r.phase==='product-before').frame++;assert.throws(()=>analyzeCameraSubmission(rows,t),/reordered/);
 assert.throws(()=>analyzeCameraSubmission(fixture.live.filter(r=>r.phase!=='scratch-store'),t),/Missing exact store result/);
});
