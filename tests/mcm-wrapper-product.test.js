import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareWrapperProduct} from '../scripts/mcm-reference/compare-wrapper-product.mjs';
import {analyzeWrapperProduct} from '../scripts/mcm-reference/analyze-wrapper-product.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/wrapper-product-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('wrapper inline matrix arithmetic matches 8192 original instruction-block executions',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');assert.deepEqual(compareWrapperProduct(input,output),{cases:8192,words:131072,differences:0,examples:[]});output[0]^=1;assert.equal(compareWrapperProduct(input,output).differences,1);assert.throws(()=>compareWrapperProduct(input,output.subarray(0,-1)),/Incomplete/);
});
test('computed render camera supplies wrapper matrices and rider bounds decisions',()=>{
 const terrain=loadTerrain('quarries-dunes'),r=analyzeWrapperProduct(fixture.live,terrain);assert.deepEqual({...r,bounds:undefined},{bounds:undefined,computedProducts:236,warmupProducts:4,copiedBounds:240,computedMatrixWords:3776});assert.equal(r.bounds.node.riderStores,59);assert.equal(r.bounds.node.render.render.submission.bikeCarryChecks,58);assert.equal(r.bounds.accepted,120);assert.equal(r.bounds.rejected,120);assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,44);
 for(const [index,pattern]of [[0,/Computed wrapper matrix/],[16,/Stored camera combined/],[32,/Actor bounds copy/],[40,/viewport width/]]){const rows=structuredClone(fixture.live);const event=rows.find(r=>r.phase==='wrapper-inputs'&&r.frame>0);event.words[index]=index===0?0x42c80000:(event.words[index]^1)>>>0;assert.throws(()=>analyzeWrapperProduct(rows,terrain),pattern);}
 const matrix=structuredClone(fixture.live);matrix.find(r=>r.phase==='bounds-entry'&&r.frame>0).words[0]^=1;assert.throws(()=>analyzeWrapperProduct(matrix,terrain),/Computed wrapper matrix/);
 assert.throws(()=>analyzeWrapperProduct(fixture.live.filter(r=>r.phase!=='wrapper-inputs'),terrain),/Missing wrapper inputs/);
});
