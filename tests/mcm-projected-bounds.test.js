import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareProjectedBounds} from '../scripts/mcm-reference/compare-projected-bounds.mjs';
import {analyzeProjectedBounds} from '../scripts/mcm-reference/analyze-projected-bounds.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/projected-bounds-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('projected bounds match intact native execution including optional outputs and exceptional floats',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');assert.deepEqual(compareProjectedBounds(input,output),{cases:8192,words:311296,accepted:2076,differences:0,examples:[]});output[0]^=1;assert.equal(compareProjectedBounds(input,output).differences,1);assert.throws(()=>compareProjectedBounds(input,output.subarray(0,-1)),/Incomplete/);
});
test('computed bounds decisions drive the captured rider draw and exact physics-stack writes',()=>{
 const terrain=loadTerrain('quarries-dunes'),r=analyzeProjectedBounds(fixture.live,terrain);assert.deepEqual({...r,node:undefined},{node:undefined,bounds:240,accepted:120,rejected:120,cornerWords:7680,rectangleWords:960});assert.equal(r.node.riderStores,59);assert.equal(r.node.render.render.submission.bikeCarryChecks,58);assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,44);
 const result=structuredClone(fixture.live);result.find(r=>r.phase==='bounds-exit').result^=1;assert.throws(()=>analyzeProjectedBounds(result,terrain),/acceptance differs/);
 const corners=structuredClone(fixture.live);corners.find(r=>r.phase==='bounds-exit').words[0]^=1;assert.throws(()=>analyzeProjectedBounds(corners,terrain),/corners differ/);
 const rect=structuredClone(fixture.live);rect.find(r=>r.phase==='wrapper-cull').fields[0]++;assert.throws(()=>analyzeProjectedBounds(rect,terrain),/rectangle differs/);
 assert.throws(()=>analyzeProjectedBounds(fixture.live.filter(r=>r.phase!=='bounds-entry'),terrain),/Missing bounds entry/);
});
