import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiSteeringControlCases} from '../scripts/mcm-reference/ai-steering-control-cases.mjs';
import {analyzeAiSteeringControl} from '../scripts/mcm-reference/analyze-ai-steering-control.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-steering-control-wine11.json.br',import.meta.url)))),hash=b=>createHash('sha256').update(b).digest('hex'),rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
function options(){const f=fixture(),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
test('final steering smoothing matches 4096 repeated original executions',()=>{
 const f=fixture(),{input,expected}=generateAiSteeringControlCases(),native=Buffer.from(f.native,'base64');assert.equal(input.length,4096*12);assert.equal(native.length,4096*8);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('256 live commands retain steering through computed lookahead and 156 explicit crash clears',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,17);
 assert.deepEqual(analyzeAiSteeringControl(rows(),options()),{calls:256,clears:156,targetChanges:19,steeringChanges:14});
});
test('missing crash clears and altered outputs cannot be hidden by reseeding steering',()=>{
 assert.throws(()=>analyzeAiSteeringControl(rows().filter(r=>r.phase!=='crash-control-clear'),options()),/Retained steering entry/);
 let r=rows();r.find(r=>r.phase==='crash-control-clear').value=1;assert.throws(()=>analyzeAiSteeringControl(r,options()),/Computed crash clear/);
 r=rows();const observed=r.find(r=>r.phase==='steering-control-after'),b=Buffer.from(observed.hex,'hex');b.writeUInt32LE(b.readUInt32LE(0x6f4)^1,0x6f4);observed.hex=b.toString('hex');assert.throws(()=>analyzeAiSteeringControl(r,options()),/Computed steering output/);
 r=rows();r.find(r=>r.phase==='steering-control-before').dtBits^=1;assert.throws(()=>analyzeAiSteeringControl(r,options()),/Steering timestep/);
});
