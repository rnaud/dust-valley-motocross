import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareChaseFov} from '../scripts/mcm-reference/compare-chase-fov.mjs';
import {analyzeLiveChaseController} from '../scripts/mcm-reference/analyze-live-chase-controller.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-fov-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('FOV smoothing, setter and update prefix match 4096 native cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseFov(input,output),{cases:4096,words:32768,differences:0,examples:[]});output[24]^=1;assert.equal(compareChaseFov(input,output).differences,1);assert.throws(()=>compareChaseFov(input,output.subarray(0,-1)),/Incomplete/);
});
test('live camera chain retains FOV filter, pose and refresh counter without reseeding',()=>{
 const options={terrain:loadTerrain('quarries-dunes'),fov:true};
 assert.deepEqual(analyzeLiveChaseController(fixture.live,options),{pairs:60,downstreamWords:3120,spatialWords:720,retainedTargetChecks:60,active:60,bypassed:0,resets:0,modes:[0],postWords:1920,clearanceWords:480,finalizeWords:1860,refreshCounterBoundaryInputs:0,fovWords:480});
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,14);
 for(const [phase,field,index,pattern] of [['source-entry','cameraPose',12,/Retained full camera differs/],['source-entry','inputs',94,/Retained FOV filter differs/],['fov','inputs',94,/Native FOV filter differs/],['fov','inputs',90,/Native FOV differs/],['updated','cameraPose',12,/Native update pose\/counter differs/],['updated','inputs',92,/Native update byte differs/],['fov-entry','inputs',49,/Unrecovered camera mode\/FOV controls changed/]]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase===phase&&r.frame===1);r[field][index]=(r[field][index]^1)>>>0;assert.throws(()=>analyzeLiveChaseController(rows,options),pattern);
 }
 assert.throws(()=>analyzeLiveChaseController(fixture.live.slice(0,-1),options),/Incomplete/);
});
