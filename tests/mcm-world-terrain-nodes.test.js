import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs';import{brotliDecompressSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import{analyzeWorldBikes}from'../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-terrain-resources-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true};
test('retained terrain traversal and complete updates match 64 original snapshots',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.equal(r.terrainNodeTicks,63);assert.equal(r.terrainNodeReports.length,64);
 for(const row of r.terrainNodeReports){
  assert.equal(row.words,1662408);assert.equal(row.updateBytes,3954516);
  assert.deepEqual(row.updateDifferences,[]);assert.deepEqual(row.ownerDifferences,[]);assert.deepEqual(row.globalDifferences,[]);
 }
 // Rendering remains deliberately visible as an unresolved boundary.
 assert.ok(r.terrainNodeReports.some(row=>row.differences.length));
 for(const x of r.sceneChildReports)assert.deepEqual(x.externalActors.map(a=>a.update),[0x411000]);
 const {terrainNodeReports,...connected}=r;
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='differences')assert.ok(Array.isArray(x)?x.length===0:x===0);else check(x);}}};check(connected);
});
test('terrain node observation corruption is reported without changing simulated state',()=>{
 const files={...fixture.files},rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 const row=rows.find(x=>x.sceneTerrainObservation?.nodeSnapshot?.nodes.length),observed=row.sceneTerrainObservation.nodeSnapshot.nodes[0],bytes=Buffer.from(observed.hex,'hex');
 bytes[0x60]^=1;observed.hex=bytes.toString('hex');
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';
 const r=analyzeWorldBikes(files,terrain(),options);
 const changes=r.terrainNodeReports.flatMap(x=>x.updateDifferences);
 assert.ok(changes.length);assert.ok(changes.every(x=>x.address===observed.address&&x.offset===0x60));
 assert.ok(r.terrainNodeReports.every(x=>x.ownerDifferences.length===0&&x.globalDifferences.length===0));
});
