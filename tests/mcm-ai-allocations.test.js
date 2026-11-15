import {analyzeAiAllocations} from '../scripts/mcm-reference/analyze-ai-allocations.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeAiMotionGraph} from '../scripts/mcm-reference/analyze-ai-motion-graph.mjs';import {analyzeAiMotion} from '../scripts/mcm-reference/analyze-ai-motion.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-allocations').live.trim().split('\n').map(JSON.parse);
function options(){const f=read('ai-final-controls'),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(i=>i===null?null:node(i));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
test('128 live controller calls retain allocation accounting through 176 allocations and frees',()=>{
 const f=read('ai-allocations');assert.equal(hash(f.live),f.provenance.liveSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.provenance.capture,/renderFrames=128 status=1/);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,24);
 assert.deepEqual(analyzeAiAllocations(rows()),{calls:128,allocations:176,frees:176,skipped:40,finalOwnerBytes:4286927792});
 assert.deepEqual(analyzeAiMotion(rows(),options()),{calls:128,gas:87,brake:0,rotations:88,boosts:0});
});
test('allocation replay rejects changed sizes, pointer identity, counters and missing events',()=>{
 for(const [instruction,key] of [[0x45c832,'eax'],[0x45c849,'eax'],[0x45c854,'esi'],[0x45c8f3,'ownerBytes'],[0x45c849,'globalBytes'],[0x45c8d0,'count']]){const r=rows(),e=r.find(x=>x.instruction===instruction);e[key]=(e[key]^1)>>>0;assert.throws(()=>analyzeAiAllocations(r));}
 const r=rows(),e=r.filter(x=>x.phase==='before')[1],b=Buffer.from(e.hex,'hex');b.writeUInt32LE((b.readUInt32LE(0x40c)^1)>>>0,0x40c);e.hex=b.toString('hex');assert.throws(()=>analyzeAiAllocations(r),/Retained allocation entry/);
 assert.throws(()=>analyzeAiAllocations(rows().filter(r=>r.phase!=='allocation-event')),/Complete successful allocation lifecycle/);
});
