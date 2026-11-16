import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-application-frame-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,markerDrawIntegration:true,hudIntegration:true,sceneChildIntegration:true,sceneTickIntegration:true,applicationFrameIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true,terrainEmissionIntegration:true};
test('outer application scheduler drives both retained bikes through acceleration and release',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options),a=r.applicationFrameReport;
 assert.equal(a.frames,64);assert.equal(a.clocks,63);assert.equal(a.updates,64);assert.equal(a.draws,63);assert.equal(a.presentations,63);assert.equal(a.ownerFrames,63);assert.equal(a.comparedWords,6048);
 assert.equal(r.sceneTickReport.ownerFrames,63);assert.equal(r.entryReports.length,128);
 const check=v=>{if(v&&typeof v==='object')for(const[k,x]of Object.entries(v)){if(/differences$/i.test(k))assert.ok(Array.isArray(x)?x.length===0:x===0,k);else check(x);}};check(r);
});
test('later clock state remains an assertion and clock service returns must produce the bike delta',()=>{
 for(const [phase,key,message]of [['entry','previous',/Retained application previous differs/],['clock-after','current',/Application-derived bike delta differs/],['exit','previous',/Retained application previous differs/]]){
  const rows=fixture.files['world-application-observations.jsonl'].trim().split('\n').map(JSON.parse),row=rows.find(r=>r.phase===phase&&r.frame===1);row[key]=(row[key]+100)>>>0;
  if(phase==='clock-after')for(const r of rows)if(r.frame===1&&['input-after','optional-after'].includes(r.phase))r.current=row.current;
  assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-application-observations.jsonl':rows.map(JSON.stringify).join('\n')+'\n'},terrain(),options),message);
 }
});
test('application scheduler rejects missing and reordered outer boundaries',()=>{
 const original=fixture.files['world-application-observations.jsonl'].trim().split('\n').map(JSON.parse),index=original.findIndex(r=>r.frame===1&&r.phase==='optional-after');
 for(const reorder of [false,true]){
  const rows=structuredClone(original);if(reorder)[rows[index],rows[index+1]]=[rows[index+1],rows[index]];else rows.splice(index,1);
  assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-application-observations.jsonl':rows.map(JSON.stringify).join('\n')+'\n'},terrain(),options),/Missing\/reordered application boundary/);
 }
});
