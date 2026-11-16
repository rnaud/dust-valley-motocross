import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-tick-wine11.json.br',import.meta.url))));
function terrain(){const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};}
const options={renderCameraInputs:true,particleIntegration:true,markerIntegration:true,markerDrawIntegration:true,hudIntegration:true,sceneChildIntegration:true,sceneTickIntegration:true,chaseIntegration:true,sceneQueueIntegration:true,sceneRendererIntegration:true,sceneDisplayStateIntegration:true,sceneDisplayFadeIntegration:true,sceneDisplayVisibilityIntegration:true,terrainViewIntegration:true,terrainNodeIntegration:true,terrainEmissionIntegration:true};
test('retained scene prefix, timer rollover and frame owner surround both bikes without reseeding',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const r=analyzeWorldBikes(fixture.files,terrain(),options),s=r.sceneTickReport;
 assert.equal(s.heads,63);assert.equal(s.tails,63);assert.equal(s.inputQueries,63);assert.equal(s.ownerFrames,63);
 assert.ok(s.reports.some((r,i)=>i&&r.minutes>s.reports[i-1].minutes&&r.seconds<s.reports[i-1].seconds),'Missing live timer rollover');
 const check=v=>{if(Array.isArray(v)){for(const x of v)check(x);}else if(v&&typeof v==='object'){for(const[k,x]of Object.entries(v)){if(/differences$/i.test(k))assert.ok(Array.isArray(x)?x.length===0:x===0,k);else check(x);}}};check(r);
});
test('later scene clock and owner counter observations cannot become simulation inputs',()=>{
 const original=fixture.files['world-scene-tick-observations.jsonl'].trim().split('\n');
 for(const [phase,key,offset]of [['timer-exit','scene',0x6c],['owner-exit','owner',0x40]]){
  const rows=original.map(JSON.parse),row=rows.find(r=>r.phase===phase),block=row.blocks.find(b=>b.address===row[key]),bytes=Buffer.from(block.hex,'hex');bytes[offset]^=1;block.hex=bytes.toString('hex');
  assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-scene-tick-observations.jsonl':rows.map(JSON.stringify).join('\n')+'\n'},terrain(),options),/Retained scene update bytes differ/);
 }
});
test('scene comparison rejects missing owner advancement and changed external menu context',()=>{
 const rows=fixture.files['world-scene-tick-observations.jsonl'].trim().split('\n').map(JSON.parse),index=rows.findIndex(r=>r.phase==='owner-entry'),missing=rows.filter((_,i)=>i!==index);
 assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-scene-tick-observations.jsonl':missing.map(JSON.stringify).join('\n')+'\n'},terrain(),options),/Missing\/reordered scene boundary/);
 rows.find(r=>r.phase==='entry').menu=1;
 assert.throws(()=>analyzeWorldBikes({...fixture.files,'world-scene-tick-observations.jsonl':rows.map(JSON.stringify).join('\n')+'\n'},terrain(),options),/Unrecovered scene context changed: menu/);
});
