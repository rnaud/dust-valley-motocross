import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-marker-draw-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,markerDrawIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true,terrainEmissionIntegration:true};
test('joint bike replay derives marker draw caches without later state imports',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.equal(r.markerReports.length,256);assert.equal(r.markerDrawReport.draws,63);assert.equal(r.markerDrawReport.queries,63);
 for(const row of r.markerReports){assert.deepEqual(row.differences,[]);assert.deepEqual(row.cacheDifferences,[]);}
 assert.deepEqual(r.terrainAllocatorReport,{remainingAllocatorEvents:0,allocatorGlobalDifferences:[]});
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(/differences$/i.test(k))assert.ok(Array.isArray(x)?x.length===0:x===0,k);else check(x);}}};check(r);
});
test('later marker cache assertions cannot seed subsequent world state',()=>{
 const files={...fixture.files},rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),b=Buffer.from(rows[8].markerObservation.shapeHex,'hex');b[0xc4]^=1;rows[8].markerObservation.shapeHex=b.toString('hex');
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';const r=analyzeWorldBikes(files,terrain(),options);
 assert.equal(r.markerReports.reduce((n,x)=>n+x.cacheDifferences.length,0),1);assert.equal(r.markerReports[8].cacheDifferences[0].offset,0xc4);
});
test('computed marker component queries reject altered or missing native evidence',()=>{
 const rows=fixture.files['world-marker-queries.jsonl'].trim().split('\n').map(JSON.parse),b=Buffer.from(rows[0].shapeHex,'hex');b[0x84]^=1;rows[0].shapeHex=b.toString('hex');
 assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-marker-queries.jsonl':rows.map(JSON.stringify).join('\n')+'\n'},terrain(),options),/Marker draw transform differs/);
 assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-marker-queries.jsonl':rows.slice(1).map(JSON.stringify).join('\n')+'\n'},terrain(),options),/Unexpected marker world query/);
});
