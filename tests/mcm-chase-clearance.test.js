import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareChaseClearance} from '../scripts/mcm-reference/compare-chase-clearance.mjs';
import {analyzeLiveChaseController} from '../scripts/mcm-reference/analyze-live-chase-controller.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-clearance-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
for(const id of Object.keys(fixture.cases))test(`camera clearance with intact original terrain query matches 4096 ${id} cases`,()=>{
 const t=loadTerrain(id),c=fixture.cases[id],input=Buffer.from(c.inputHex,'hex'),output=Buffer.from(c.outputHex,'hex');
 assert.deepEqual(compareChaseClearance(t,input,output),{cases:4096,words:24576,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseClearance(t,input,output).differences,1);assert.throws(()=>compareChaseClearance(t,input,output.subarray(0,-1)),/Incomplete/);
});
test('live retained controller agrees through original camera-clearance terrain query',()=>{
 const terrain=loadTerrain('quarries-dunes');assert.deepEqual(analyzeLiveChaseController(fixture.live,{terrain}),{pairs:60,downstreamWords:3120,spatialWords:720,retainedTargetChecks:60,active:60,bypassed:0,resets:0,modes:[0],postWords:1920,clearanceWords:480});
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,10);
 for(const [field,index,pattern] of [['groundPoint',1,/ground query differs/],['result',4,/clearance output differs/],['inputs',23,/clearance camera differs/],['inputs',30,/world gate differs/]]){
  const rows=structuredClone(fixture.live),r=rows.find(r=>r.phase==='clearance');r[field][index]=(r[field][index]^1)>>>0;assert.throws(()=>analyzeLiveChaseController(rows,{terrain}),pattern);
 }
 assert.throws(()=>analyzeLiveChaseController(fixture.live.slice(0,-1),{terrain}),/Incomplete/);
});
