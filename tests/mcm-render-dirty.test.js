import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeRenderDirty} from '../scripts/mcm-reference/analyze-render-dirty.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-dirty-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('retained dirty state predicts every captured product and physics-stack overlap',()=>{
 const terrain=loadTerrain('quarries-dunes'),r=analyzeRenderDirty(fixture.live,terrain);assert.deepEqual({...r,render:undefined},{render:undefined,seeded:1,setters:760,applies:4793,products:286,skipped:4507,overlaps:59});assert.equal(r.render.submission.bikeCarryChecks,58);assert.equal(r.render.restoredLoops,59);
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,37);assert.deepEqual([...new Set(fixture.live.filter(r=>r.phase==='controls-entry').map(r=>r.inputs[64]))],[0]);
 for(const phase of ['dirty-set-exit','apply-gate','apply-cleared','apply-exit']){const rows=structuredClone(fixture.live),event=rows.find(r=>r.phase===phase);event.flags^=2;assert.throws(()=>analyzeRenderDirty(rows,terrain),/dirty flag differs/);}
 const address=structuredClone(fixture.live);address.find(r=>r.phase==='apply-product').destination+=16;assert.throws(()=>analyzeRenderDirty(address,terrain),/product address differs/);
 const missing=structuredClone(fixture.live);missing.splice(missing.findIndex(r=>r.phase==='apply-product'),1);assert.throws(()=>analyzeRenderDirty(missing,terrain),/product count/);
 const setter=structuredClone(fixture.live);setter.splice(setter.findIndex(r=>r.phase==='dirty-set-entry'),1);assert.throws(()=>analyzeRenderDirty(setter,terrain),/Missing setter entry/);
});
