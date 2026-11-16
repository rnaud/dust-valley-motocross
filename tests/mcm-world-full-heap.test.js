import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
import {createWorldHeapRuntime} from '../scripts/mcm-reference/world-heap-runtime.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-full-allocator-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,markerDrawIntegration:true,hudIntegration:true,sceneChildIntegration:true,sceneTickIntegration:true,applicationFrameIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true,terrainEmissionIntegration:true,riderHeapIntegration:true,fullHeapIntegration:true};
test('both bikes and the complete shared scene match with computed allocator placement',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.equal(r.fullHeapIntegration,true);assert.equal(r.worldRiderReports.length,252);assert.equal(r.entryReports.length,128);assert.equal(r.sceneDisplayReports.length,256);
 assert.deepEqual(r.riderHeapReport,{allocations:5229,frees:4801,sizeQueries:9602,affinity:6,virtualMemory:{commits:1,decommits:0,releases:0,reservations:1,committedPages:896}});
 assert.deepEqual(r.terrainBankReadReport,{nodes:12594,adjacentReads:4});
 const check=v=>{if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(/differences$/i.test(k))assert.ok(Array.isArray(x)?x.length===0:x===0,k);else check(x);}};check(r);
});
test('allocator rejects thread state from another checkpoint',()=>{
 const files={...fixture.files},thread=JSON.parse(files['world-heap-thread.json']);thread.captureId='other';files['world-heap-thread.json']=JSON.stringify(thread);
 assert.throws(()=>createWorldHeapRuntime(files),/capture differs/);
});
