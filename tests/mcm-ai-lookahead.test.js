import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiLookaheadCases} from '../scripts/mcm-reference/ai-lookahead-cases.mjs';
import {analyzeAiLookahead} from '../scripts/mcm-reference/analyze-ai-lookahead.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-lookahead-wine11.json.br',import.meta.url)))),hash=b=>createHash('sha256').update(b).digest('hex'),rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
function terrain(){const bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),fixture().provenance.assetSha256);const asset=JSON.parse(gunzipSync(bytes));assert.equal(asset.sha256,fixture().provenance.courseSha256);const t=asset.terrain,cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};}
const options=()=>({...fixture().configuration,terrain:terrain()});
test('complete lookahead and intact original terrain queries match 4096 repeated executions',()=>{
 const f=fixture(),{input,expected}=generateAiLookaheadCases(terrain()),native=Buffer.from(f.native,'base64');assert.equal(input.length,4096*448);assert.equal(native.length,4096*32);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('256 live calls retain projected targets through 102 computed terrain queries and 15 steering changes',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,14);
 const {checks,...r}=analyzeAiLookahead(rows(),options());assert.equal(checks.length,256);assert.deepEqual(r,{calls:256,queryCount:102,targetChanges:33,steeringChanges:15});
});
test('lookahead rejects changed outputs, reseeded targets, altered terrain and configuration',()=>{
 let r=rows();r.find(r=>r.phase==='lookahead-after').stack[11]^=1;assert.throws(()=>analyzeAiLookahead(r,options()),/Computed lookahead outputs/);
 r=rows();const entry=r.filter(r=>r.phase==='before')[1],b=Buffer.from(entry.hex,'hex');b.writeUInt32LE(b.readUInt32LE(0xb80)^1,0xb80);entry.hex=b.toString('hex');assert.throws(()=>analyzeAiLookahead(r,options()),/Retained target entry/);
 const o=options();o.terrain.heightScale*=.5;assert.throws(()=>analyzeAiLookahead(rows(),o),/Computed lookahead outputs/);
 assert.throws(()=>analyzeAiLookahead(rows(),{...options(),margin:25}),/Computed lookahead outputs/);
 r=rows().filter(r=>r.phase!=='lookahead-after');assert.throws(()=>analyzeAiLookahead(r,options()),/Missing lookahead output/);
});
