import {replayAiContactEvents} from '../scripts/mcm-reference/analyze-ai-contact-events.mjs';
import {analyzeAiTrickGraph} from '../scripts/mcm-reference/analyze-ai-trick-graph.mjs';
import {analyzeAiTrickSelect} from '../scripts/mcm-reference/analyze-ai-trick-select.mjs';
import {analyzeAiAllocations} from '../scripts/mcm-reference/analyze-ai-allocations.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeAiMotionGraph} from '../scripts/mcm-reference/analyze-ai-motion-graph.mjs';import {analyzeAiMotion} from '../scripts/mcm-reference/analyze-ai-motion.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-controller-events').live.trim().split('\n').map(JSON.parse);
function options(){const f=read('ai-final-controls'),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(i=>i===null?null:node(i));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
test('computed contact clear connects 110 retained controller calls, trick graphs and allocations',()=>{
 const f=read('ai-controller-events');assert.equal(hash(f.live),f.provenance.liveSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.provenance.capture,/renderFrames=110 status=1 contactChanges=1 trickEvents=1/);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,28);
 const contacts=replayAiContactEvents(rows());assert.equal(contacts.calls,1183);assert.equal(contacts.clears,1);assert.deepEqual(contacts.checks.filter(c=>c.before!==c.latch).map(({sequence,before,latch})=>({sequence,before,latch})),[{sequence:109,before:1,latch:0}]);
 assert.deepEqual(analyzeAiTrickGraph(rows()),{calls:1,resets:1,nodes:8,checks:[{sequence:5,selected:8}]});
 assert.deepEqual(analyzeAiAllocations(rows()),{calls:110,allocations:156,frees:156,skipped:32,finalOwnerBytes:4286547240});
 assert.deepEqual(analyzeAiMotionGraph(rows()),{calls:110,rotations:78,boosts:0,nodes:880,invalidations:270});
 assert.deepEqual(analyzeAiMotion(rows(),options()),{calls:110,gas:78,brake:0,rotations:78,boosts:0});
});
test('retained replay requires the contact transition and rejects observed-state corruption',()=>{
 assert.throws(()=>analyzeAiMotion(rows().filter(r=>!r.phase.startsWith('contact-response')),options()),/Retained jump entry 109 field b4c/);
 const r=rows(),contacts=replayAiContactEvents(r),clear=contacts.checks.find(c=>c.before!==c.latch);r[clear.exitIndex].bodyWords[0xb4c]=1;assert.throws(()=>analyzeAiMotion(r,options()),/Computed contact field b4c/);
 const missing=rows();missing.splice(clear.index,2);assert.throws(()=>analyzeAiMotion(missing,options()),/Retained (contact latch entry|jump entry)/);
});
test('retained controller checks the complete trick graph as well as numeric controls',()=>{
 const r=rows(),e=r.find(r=>r.phase==='trick-graph-after'),node=e.nodes[0],bytes=Buffer.from(node.hex,'hex');bytes[0x84]^=1;node.hex=bytes.toString('hex');assert.throws(()=>analyzeAiMotion(r,options()),/Computed trick graph node/);
});
