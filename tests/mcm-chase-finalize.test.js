import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareChaseFinalize} from '../scripts/mcm-reference/compare-chase-finalize.mjs';
import {analyzeLiveChaseController} from '../scripts/mcm-reference/analyze-live-chase-controller.mjs';
import {finalizeMcmChaseCamera} from '../src/physics/mcm/chase-finalize.js';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-finalize-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('final camera pose, roll and node fields match 2048 original cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseFinalize(input,output),{cases:2048,words:63488,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseFinalize(input,output).differences,1);
 assert.throws(()=>compareChaseFinalize(input,output.subarray(0,-1)),/Incomplete/);
 assert.throws(()=>finalizeMcmChaseCamera({retainedMode:1},[],{}),/Unrecovered/);
});
test('live computed chase eye and target match final pose with retained pose and nodes',()=>{
 const options={terrain:loadTerrain('quarries-dunes'),finalize:true};
 assert.deepEqual(analyzeLiveChaseController(fixture.live,options),{pairs:60,downstreamWords:3120,spatialWords:720,retainedTargetChecks:60,active:60,bypassed:0,resets:0,modes:[0],postWords:1920,clearanceWords:480,finalizeWords:1860,refreshCounterBoundaryInputs:60});
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,11);
 for(const [field,index,pattern] of [['cameraPose',0,/finalized camera differs/],['cameraPose',9,/finalized camera differs/],['cameraPose',12,/finalized camera differs/],['nodeVisibility',0,/finalized nodes differ/],['nodeVisibility',7,/finalized nodes differ/]]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase==='finalized');r[field][index]=(r[field][index]^1)>>>0;assert.throws(()=>analyzeLiveChaseController(rows,options),pattern);
 }
 for(const [field,index,pattern] of [['cameraPose',3,/Retained render camera differs/],['nodeVisibility',8,/Retained render nodes differ/]]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase==='source-entry'&&r.frame===1);r[field][index]=(r[field][index]^1)>>>0;assert.throws(()=>analyzeLiveChaseController(rows,options),pattern);
 }
 assert.throws(()=>analyzeLiveChaseController(fixture.live.slice(0,-1),options),/Incomplete/);
 assert.throws(()=>analyzeLiveChaseController(fixture.live.filter(r=>r.phase!=='finalized'),options),/Missing or reordered/);
});
