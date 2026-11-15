import {analyzeAiTrickGraph} from '../scripts/mcm-reference/analyze-ai-trick-graph.mjs';
import {analyzeAiTrickSelect} from '../scripts/mcm-reference/analyze-ai-trick-select.mjs';
import {analyzeAiAllocations} from '../scripts/mcm-reference/analyze-ai-allocations.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeAiMotionGraph} from '../scripts/mcm-reference/analyze-ai-motion-graph.mjs';import {analyzeAiMotion} from '../scripts/mcm-reference/analyze-ai-motion.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-trick-graph').live.trim().split('\n').map(JSON.parse);
function options(){const f=read('ai-final-controls'),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(i=>i===null?null:node(i));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
test('computed trick selection drives two complete live orientation-reset graphs',()=>{
 const f=read('ai-trick-graph');assert.equal(hash(f.live),f.provenance.liveSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.provenance.capture,/renderFrames=256 status=1/);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,26);
 assert.deepEqual(analyzeAiTrickGraph(rows()),{calls:2,resets:2,nodes:16,checks:[{sequence:46,selected:7},{sequence:245,selected:7}]});
 assert.deepEqual(analyzeAiTrickSelect(rows()),{calls:256,draws:111,allDraws:127,selections:2,rejected:12});
 assert.deepEqual(analyzeAiAllocations(rows()),{calls:256,allocations:328,frees:328,skipped:92,finalOwnerBytes:4286746728});
 assert.deepEqual(analyzeAiMotionGraph(rows()),{calls:256,rotations:164,boosts:0,nodes:2048,invalidations:188});
});
test('whole-controller replay preserves the external latch-clear failure',()=>{
 assert.throws(()=>analyzeAiMotion(rows(),options()),/Retained jump entry 22 field b4c/);
});
test('trick replay rejects changed body, animation, envelope, graph and records',()=>{
 for(const [field,offset] of [['hex',0x218],['hex',0x540],['hex',0x10],['hex',0x818],['proxy',0x14],['envelope',4],['bounds',0x1c]]){const r=rows(),e=r.find(x=>x.phase==='trick-graph-after'),b=Buffer.from(e[field],'hex');b[offset]^=1;e[field]=b.toString('hex');assert.throws(()=>analyzeAiTrickGraph(r));}
 for(const [field,offset] of [['nodes',0x84],['nodes',0xc4],['nodes',0x104],['records',8]]){const r=rows(),e=r.find(x=>x.phase==='trick-graph-after')[field][0],b=Buffer.from(e.hex,'hex');b[offset]^=1;e.hex=b.toString('hex');assert.throws(()=>analyzeAiTrickGraph(r));}
 assert.throws(()=>analyzeAiTrickGraph(rows().filter(r=>r.phase!=='trick-graph-after')),/Missing adjacent trick exit/);
});
