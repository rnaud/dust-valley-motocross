import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs';import{brotliDecompressSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import{analyzeWorldBikes}from'../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-terrain-emission-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true,terrainEmissionIntegration:true};
test('joined terrain emission and AI share original allocation accounting without reseeding',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.equal(r.terrainNodeTicks,63);assert.equal(r.terrainNodeReports.length,64);
 assert.deepEqual(r.terrainAllocatorReport,{remainingAllocatorEvents:0,allocatorGlobalDifferences:[]});
 for(const row of r.terrainNodeReports){
  assert.equal(row.words,1662408);assert.deepEqual(row.differences,[]);assert.deepEqual(row.updateDifferences,[]);assert.deepEqual(row.ownerDifferences,[]);assert.deepEqual(row.globalDifferences,[]);
  assert.equal(row.meshReport.differences,0);assert.equal(row.meshReport.textureScaleMatches,true);assert.equal(row.meshReport.accountingActual,row.meshReport.accountingExpected);assert.equal(row.meshReport.allocatorGlobalDifferences,0);
 }
 // Scene timing and marker drawing-cache execution remain outside this milestone.
 for(const x of r.sceneChildReports)assert.deepEqual(x.externalActors.map(a=>a.update),[0x411000]);
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='differences')assert.ok(Array.isArray(x)?x.length===0:x===0);else check(x);}}};check(r);
});
test('recorded allocation requests cannot replace computed AI allocation requests',()=>{
 const files={...fixture.files},rows=files['terrain-allocation-events.jsonl'].trim().split('\n').map(JSON.parse),row=rows.find(x=>x.phase==='calloc-entry');assert.ok(row);row.argument++;
 files['terrain-allocation-events.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';
 assert.throws(()=>analyzeWorldBikes(files,terrain(),options),/Computed AI allocation count differs/);
});
test('later mesh bytes remain comparison targets and cannot seed the vertex builder',()=>{
 const files={...fixture.files},rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),row=rows.find(x=>x.sceneTerrainObservation?.meshSnapshot?.sequence===2);assert.ok(row);
 const b=Buffer.from(row.sceneTerrainObservation.meshSnapshot.builderHex,'hex');b[0x910]^=1;row.sceneTerrainObservation.meshSnapshot.builderHex=b.toString('hex');
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';const r=analyzeWorldBikes(files,terrain(),options);
 assert.equal(r.terrainNodeReports.reduce((n,x)=>n+x.meshReport.differences,0),1);assert.deepEqual(r.terrainAllocatorReport,{remainingAllocatorEvents:0,allocatorGlobalDifferences:[]});
});
