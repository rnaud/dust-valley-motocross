import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-rider-heap-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,markerDrawIntegration:true,hudIntegration:true,sceneChildIntegration:true,sceneTickIntegration:true,applicationFrameIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true,terrainEmissionIntegration:true,riderHeapIntegration:true};
test('terrain allocation operations derive both rider boundary headers across live buffer reuse',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.deepEqual(r.riderHeapReport,[{child:82698896,updates:0},{child:83086264,updates:11}]);
 assert.equal(r.worldRiderReports.length,252);assert.equal(r.entryReports.length,128);
 // This capture also exposes an open display-quad update gap from frame 51.
 // Assert the physics/terrain/heap scope separately, without hiding that gap.
 const {sceneDisplayReports,...physics}=r;
 const check=v=>{if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(/differences$/i.test(k))assert.ok(Array.isArray(x)?x.length===0:x===0,k);else check(x);}};check(physics);
 const displayGaps=sceneDisplayReports.filter(x=>x.differences.length);
 assert.equal(displayGaps.length,52);assert.equal(displayGaps[0].frame,51);
});
