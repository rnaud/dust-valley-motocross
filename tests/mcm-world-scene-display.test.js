import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-display-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true};
test('retained display timing and visibility match both-bike boundaries with graphics explicitly external',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options);
 assert.equal(r.sceneDisplayTicks,63);assert.equal(r.externalDisplayRefreshes.length,62);assert.ok(r.externalDisplayRefreshes.every(v=>v.graphicsExternal===true));
 assert.equal(r.sceneDisplayReports.length,256);assert.equal(r.entryReports.length,128);assert.equal(r.reports.length,128);
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='differences')assert.ok(Array.isArray(x)?x.length===0:x===0);else check(x);}}};check(r);
 for(const row of r.sceneChildReports)assert.deepEqual(row.externalActors.map(a=>a.update),[0x411000,0x422df0]);
 assert.equal(r.chaseReport.frames,63);assert.equal(r.sceneRendererReport.frames,63);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,52);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
});
test('display assertions detect changed timer output and reject missing observations',()=>{
 const files={...fixture.files},rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 const b=Buffer.from(rows[4].sceneDisplayObservation.actor.hex,'hex');b[0x100]^=1;rows[4].sceneDisplayObservation.actor.hex=b.toString('hex');
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';
 const r=analyzeWorldBikes(files,terrain(),options);assert.equal(r.sceneDisplayReports.filter(x=>x.differences.length).length,1);assert.equal(r.sceneDisplayReports[4].differences[0].offset,0x100);
 delete rows[0].sceneDisplayObservation;files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n')+'\n';assert.throws(()=>analyzeWorldBikes(files,terrain(),options),/Missing display assertion/);
});
test('full display-child diagnostic preserves missing draw-time writers instead of reseeding fade state',()=>{
 const full=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-display-fade-wine11.json.br',import.meta.url))));
 for(const[name,value]of Object.entries(full.files))assert.equal(createHash('sha256').update(value).digest('hex'),full.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(full.files,terrain(),{...options,sceneDisplayFadeIntegration:true});
 assert.equal(r.sceneDisplayFadeTicks,63);assert.equal(r.sceneDisplayReports.length,256);
 assert.equal(r.sceneDisplayReports.filter(x=>x.differences.length).length,208);
 assert.deepEqual([...new Set(r.sceneDisplayReports.flatMap(x=>x.differences.map(d=>d.offset)))].sort((a,b)=>a-b),[0xe4,0x100,0x104,0x108,0x10c,0x114,0x118]);
 for(const row of [...r.entryReports,...r.reports])assert.deepEqual(row.differences,[]);
 for(const row of r.sceneChildReports)assert.deepEqual(row.externalActors.map(a=>a.update),[0x411000]);
 assert.equal((full.files['cleanup.log'].match(/restored=1/g)||[]).length,52);assert.match(full.files['cleanup.log'],/debugger=0 clean=1/);
});
test('computed camera-to-rider terrain queries resolve all full display-child differences',()=>{
 const full=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-display-fade-wine11.json.br',import.meta.url))));
 const r=analyzeWorldBikes(full.files,terrain(),{...options,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true});
 assert.equal(r.sceneDisplayFadeTicks,63);assert.equal(r.sceneDisplayReports.length,256);assert.ok(r.sceneDisplayVisibilityDraws>0);assert.ok(r.sceneDisplayVisibilityQueries>0&&r.sceneDisplayVisibilityQueries<r.sceneDisplayVisibilityDraws);
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(k==='differences')assert.ok(Array.isArray(x)?x.length===0:x===0);else check(x);}}};check(r);
});
