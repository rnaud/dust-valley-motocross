import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs';import{brotliDecompressSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import{analyzeWorldBikes}from'../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-terrain-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true};
test('retained camera drives terrain view fields including final observed partial frame',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);assert.equal(r.terrainViewTicks,63);assert.equal(r.terrainViewReports.length,256);assert.equal(r.terrainViewReports.reduce((n,x)=>n+x.words,0),2304);
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='differences')assert.ok(Array.isArray(x)?x.length===0:x===0);else check(x);}}};check(r);
 for(const x of r.sceneChildReports)assert.deepEqual(x.externalActors.map(a=>a.update),[0x411000]);
});
test('terrain view outputs remain assertions rather than replacement camera state',()=>{
 const files={...fixture.files},rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),b=Buffer.from(rows.at(-1).sceneTerrainObservation.hex,'hex');b[0x48]^=1;rows.at(-1).sceneTerrainObservation.hex=b.toString('hex');files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';
 const r=analyzeWorldBikes(files,terrain(),options);assert.equal(r.terrainViewReports.filter(x=>x.differences.length).length,1);assert.equal(r.terrainViewReports.at(-1).differences[0].offset,0x48);
});
