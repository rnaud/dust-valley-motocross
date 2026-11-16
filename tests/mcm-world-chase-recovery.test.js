import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
import {validateWorldInputProtocol} from '../scripts/mcm-reference/world-input-protocol.mjs';
test('joined two-bike camera comparison survives pursuit contacts and two player recoveries',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-chase-recovery-wine11.json.br',import.meta.url)))),files=fixture.files;
 for(const [name,value]of Object.entries(files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal(fixture.provenance.retainedRows['frames.jsonl'].selected,160);
 assert.deepEqual(validateWorldInputProtocol(files).frames.map(r=>r.throttle),[...Array(96).fill(1),...Array(64).fill(0)]);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 const result=analyzeWorldBikes(files,{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid},{renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true});
 assert.deepEqual(result.chaseReport,{frames:159,words:23850,intermediateEvolutionInputs:0,tailControlAssertions:159,comparedInputWords:3840,target:JSON.parse(files['world-entry.json']).bikes[1]});
 for(const [name,count]of [['entryReports',320],['reports',320],['riderReports',159],['collisionReports',319],['visualReports',319],['markerReports',640],['hudReports',640]]){
  assert.equal(result[name].length,count);for(const r of result[name]){assert.deepEqual(r.differences,[]);if(r.random)assert.equal(r.random.actual,r.random.expected);}
 }
 assert.equal(result.worldRiderReports.length,636);for(const r of result.worldRiderReports){assert.deepEqual(r.rider.differences,[]);assert.deepEqual(r.collision.differences,[]);}
 assert.equal(result.particleReports.length,1431);assert.ok(result.particleReports.every(r=>r.differences===0));
 assert.equal(result.contactReports.length,56);assert.deepEqual([...new Set(result.contactReports.map(r=>r.kind))].sort(),[0,1,2,3,4,5]);
 const player=JSON.parse(files['world-entry.json']).bikes[0],tails=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse).filter(r=>r.bike===player&&r.phase==='after-bike');
 assert.deepEqual(tails.flatMap((r,i)=>Buffer.from(r.bodyHex,'hex').readUInt32LE(0x844)?[i]:[]),[54,55,56,122,123,124,125]);
 assert.equal(result.sceneChildReports.length,159);for(const r of result.sceneChildReports)assert.deepEqual(r.externalActors.map(a=>a.update),[0x43e660,0x411000,0x423b50,0x4253e0]);
 // Contact callbacks alone do not establish active bike impact-emitter coverage.
 assert.equal(result.impactReports.filter(r=>r.phase==='before'&&r.active).length,0);
 assert.equal((files['cleanup.log'].match(/restored=1/g)||[]).length,49);assert.match(files['cleanup.log'],/debugger=0 clean=1/);
});
