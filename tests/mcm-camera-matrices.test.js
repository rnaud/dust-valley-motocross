import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareCameraMatrices} from '../scripts/mcm-reference/compare-camera-matrices.mjs';
import {analyzeLiveChaseController} from '../scripts/mcm-reference/analyze-live-chase-controller.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/camera-matrices-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('all four camera matrices and screen scale match 4096 intact native executions',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareCameraMatrices(input,output),{cases:4096,words:266240,differences:0,examples:[]});
 output[128]^=1;assert.equal(compareCameraMatrices(input,output).differences,1);assert.throws(()=>compareCameraMatrices(input,output.subarray(0,-1)),/Incomplete/);
});
test('live retained chase pose and FOV produce the native camera matrices',()=>{
 const options={terrain:loadTerrain('quarries-dunes'),matrices:true};
 assert.deepEqual(analyzeLiveChaseController(fixture.live,options),{pairs:60,downstreamWords:3120,spatialWords:720,retainedTargetChecks:60,active:60,bypassed:0,resets:0,modes:[0],postWords:1920,clearanceWords:480,finalizeWords:1860,refreshCounterBoundaryInputs:0,fovWords:480,matrixWords:3900});
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,14);
 for(const [phase,field,index,pattern] of [['source-entry','matrices',0,/Retained camera matrices differ/],['source-entry','inputs',98,/Unrecovered projection context changed/],['fov','matrices',16,/Matrices changed before update/],...([0,16,32,48,64].map(i=>['updated','matrices',i,/Native camera matrices differ/]))]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase===phase&&r.frame===1);r[field][index]=(r[field][index]^1)>>>0;assert.throws(()=>analyzeLiveChaseController(rows,options),pattern);
 }
 assert.throws(()=>analyzeLiveChaseController(fixture.live.slice(0,-1),options),/Incomplete/);
});
