import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {compareFogPlanes} from '../scripts/mcm-reference/compare-fog-planes.mjs';
import {analyzeRenderGates} from '../scripts/mcm-reference/analyze-render-gates.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-gates-wine11.json.br',import.meta.url))));
function loadTerrain(id){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${id}.bin`,import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
}
test('fog plane setup matches intact native setter and matrix routines',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');assert.deepEqual(compareFogPlanes(input,output),{cases:4096,words:274432,rebuilt:2730,differences:0,examples:[]});output[260]^=1;assert.equal(compareFogPlanes(input,output).differences,1);assert.throws(()=>compareFogPlanes(input,output.subarray(0,-1)),/Incomplete/);
});
test('fog state survives the render cycle and model submissions supply the scratch product world',()=>{
 const terrain=loadTerrain('quarries-dunes'),r=analyzeRenderGates(fixture.live,terrain);
 assert.deepEqual({...r,submission:undefined},{submission:undefined,fogSubmissions:177,resets:59,worldSubmissions:177,worldSetters:177,restoredLoops:59,derivedProducts:59,otherWorldSetters:105,warmupEvents:28});assert.equal(r.submission.bikeCarryChecks,58);assert.equal(r.submission.chain.refreshCounterBoundaryInputs,0);
 assert.match(fixture.cleanup,/debugger=0 clean=1/);assert.equal((fixture.cleanup.match(/restored=1/g)||[]).length,31);
 for(const phase of ['fog-submit','fog-render-submit','fog-reset-submit','world-submit']){const rows=structuredClone(fixture.live),event=rows.find(r=>r.frame>0&&r.phase===phase);event.words[0]^=1;assert.throws(()=>analyzeRenderGates(rows,terrain),/projection differs|identity differs/);}
 const rows=structuredClone(fixture.live);rows.find(r=>r.frame>0&&r.phase==='world-entry').fields[0]=1;assert.throws(()=>analyzeRenderGates(rows,terrain),/Suppressed draw/);
 const missing=fixture.live.filter(r=>!(r.frame>0&&r.phase==='wine-transform'&&r.args[2]===256&&r.callers.includes(0x4458ee)));assert.throws(()=>analyzeRenderGates(missing,terrain),/not derived/);
});
