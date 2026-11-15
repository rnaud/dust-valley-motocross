import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareNodeDraw} from '../scripts/mcm-reference/compare-node-draw.mjs';
import {analyzeNodeDraw} from '../scripts/mcm-reference/analyze-node-draw.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/node-draw-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('original node dispatch matches all combinations of hidden, pending, renderable and prepared flags',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');assert.deepEqual(compareNodeDraw(input,output),{cases:625,words:1875,differences:0,branches:{hidden:500,prepared:80,prepare:20,fallback:25}});output[8]^=1;assert.equal(compareNodeDraw(input,output).differences,1);assert.throws(()=>compareNodeDraw(input,output.subarray(0,-1)),/Incomplete/);
});
test('recursive rider draw connects computed visibility to every overlapping stack store',()=>{
 const terrain=loadTerrain('quarries-dunes'),r=analyzeNodeDraw(fixture.live,terrain);assert.deepEqual({...r,render:undefined},{render:undefined,wrappers:240,rejected:120,nodes:120,visibilityChecks:118,childDepthChecks:120,riderStores:59,warmupStores:0});assert.equal(r.render.render.submission.bikeCarryChecks,58);assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,43);
 const hidden=structuredClone(fixture.live);hidden.find(r=>r.phase==='node-entry'&&r.frame>0).fields[1]=1;assert.throws(()=>analyzeNodeDraw(hidden,terrain),/Computed camera visibility/);
 const depth=structuredClone(fixture.live);depth.filter(r=>r.phase==='wrapper-entry')[1].esp+=4;assert.throws(()=>analyzeNodeDraw(depth,terrain),/depth differs/);
 const cull=structuredClone(fixture.live);cull.find(r=>r.phase==='wrapper-cull'&&r.result===0).result=1;assert.throws(()=>analyzeNodeDraw(cull,terrain),/Bounds result/);
 const identity=structuredClone(fixture.live);identity.find(r=>r.phase==='node-entry'&&r.frame>0&&r.object===r.riderNode).riderNode++;assert.throws(()=>analyzeNodeDraw(identity,terrain),/node identity/);
 const order=structuredClone(fixture.live);order.find(r=>r.phase==='node-entry').frame++;assert.throws(()=>analyzeNodeDraw(order,terrain),/reordered/);
});
