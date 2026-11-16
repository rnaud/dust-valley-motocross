import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
import {decodeChaseFrameMemory} from '../scripts/mcm-reference/chase-frame-memory.mjs';
import {deriveMcmChaseHeading,selectMcmChasePath} from '../src/physics/mcm/chase-heading.js';
import {createMcmParticleUvTail} from '../src/physics/mcm/particle-uv-tail.js';
test('remaining particle atlas entries match original initializer',()=>{
 assert.deepEqual(Buffer.from(createMcmParticleUvTail().buffer),fs.readFileSync(new URL('./fixtures/mcm/particle-uv-tail-wine11.bin',import.meta.url)));
});
test('both bikes and player camera match through three crashes and active impact bursts',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-player-camera-recovery-wine11.json.br',import.meta.url)))),files=fixture.files;
 for(const [name,value]of Object.entries(files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal(fixture.provenance.retainedRows['frames.jsonl'].selected,166);
 const alternate=[];
 for(const raw of files['world-camera-observations.jsonl'].trim().split('\n').map(JSON.parse)){
  if(raw.phase!=='source-entry')continue;const r=decodeChaseFrameMemory(raw),i=r.inputs;
  const h=deriveMcmChaseHeading({yaw:0},{mode:i[11],crashed:i[32],bike8b4:i[45],rider144:i[46],rider170:i[47],rider140:i[48]});
  if(selectMcmChasePath(i[11],h.enabled)==='alternate-eye')alternate.push(r.frame);
 }
 assert.deepEqual(alternate,[75,76,77,97,98,99,120,121,122]);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 const result=analyzeWorldBikes(files,{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid},{renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true});
 assert.deepEqual(result.chaseReport,{frames:165,words:24750,intermediateEvolutionInputs:0,tailControlAssertions:165,comparedInputWords:4482,target:JSON.parse(files['world-entry.json']).bikes[0]});
 for(const [name,count]of [['entryReports',332],['reports',332],['riderReports',165],['collisionReports',331],['visualReports',331],['markerReports',664],['hudReports',664]]){
  assert.equal(result[name].length,count);for(const r of result[name]){assert.deepEqual(r.differences,[]);if(r.random)assert.equal(r.random.actual,r.random.expected);}
 }
 assert.equal(result.worldRiderReports.length,660);for(const r of result.worldRiderReports){assert.deepEqual(r.rider.differences,[]);assert.deepEqual(r.collision.differences,[]);}
 assert.equal(result.particleReports.length,1573);assert.ok(result.particleReports.every(r=>r.differences===0));
 assert.equal(result.impactReports.filter(r=>r.phase==='before'&&r.active).length,6);
 assert.equal(result.contactReports.length,60);assert.equal(result.drawReports.length,660);
 assert.equal(result.sceneChildReports.length,165);for(const r of result.sceneChildReports)assert.deepEqual(r.externalActors.map(a=>a.update),[0x43e660,0x411000,0x423b50,0x4253e0]);
 assert.equal((files['cleanup.log'].match(/restored=1/g)||[]).length,49);assert.match(files['cleanup.log'],/debugger=0 clean=1/);
});
