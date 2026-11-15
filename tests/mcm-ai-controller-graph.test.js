import {analyzeAiControllerGraph} from '../scripts/mcm-reference/analyze-ai-controller-graph.mjs';
import {analyzeAiControllerBody} from '../scripts/mcm-reference/analyze-ai-controller-body.mjs';
import {replayAiContactEvents} from '../scripts/mcm-reference/analyze-ai-contact-events.mjs';
import {analyzeAiTrickGraph} from '../scripts/mcm-reference/analyze-ai-trick-graph.mjs';
import {analyzeAiTrickSelect} from '../scripts/mcm-reference/analyze-ai-trick-select.mjs';
import {analyzeAiAllocations} from '../scripts/mcm-reference/analyze-ai-allocations.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeAiMotionGraph} from '../scripts/mcm-reference/analyze-ai-motion-graph.mjs';import {analyzeAiMotion} from '../scripts/mcm-reference/analyze-ai-motion.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-controller-graph').live.trim().split('\n').map(JSON.parse);
function options(){const f=read('ai-final-controls'),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(i=>i===null?null:node(i));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
test('one entry graph reproduces 159 complete controller calls through a contact clear and trick',()=>{
 const f=read('ai-controller-graph');assert.equal(hash(f.live),f.provenance.liveSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.provenance.capture,/renderFrames=159 status=1 contactChanges=1 trickEvents=1/);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,28);
 const r=rows(),contacts=replayAiContactEvents(r);assert.equal(contacts.calls,1918);assert.equal(contacts.clears,1);const clear=contacts.checks.find(c=>c.before!==c.latch);assert.equal(clear.sequence,126);assert.equal(clear.before,1);assert.equal(clear.latch,0);assert.equal(r.filter(r=>r.phase==='after'&&r.sequence>clear.sequence).length,32);
 assert.deepEqual(analyzeAiControllerGraph(r,options()),{calls:159,tricks:1,resets:1,rotations:103,nodes:1272});
 const body=analyzeAiControllerBody(r,options());assert.equal(body.calls,159);assert.equal(body.comparedBytes,520248);assert.equal(body.changedWords,1810);
});
test('entry graph and animation resources drive outputs without stage graph reseeding',()=>{
 const r=rows(),entry=r.find(x=>x.phase==='controller-graph-before'),node=entry.nodes.find(n=>n.address===entry.root),b=Buffer.from(node.hex,'hex');b[0xb4]^=1;node.hex=b.toString('hex');assert.throws(()=>analyzeAiControllerGraph(r,options()),/Complete controller graph/);
 const changed=rows();for(const phase of ['controller-graph-before','controller-graph-after']){const e=changed.find(x=>x.phase===phase&&x.sequence===155);e.animations[7][3]^=1;}assert.throws(()=>analyzeAiControllerGraph(changed,options()),/Complete controller rider animation/);
});
test('complete graph comparison rejects corrupted exits and missing boundaries',()=>{
 const original=rows();for(const [field,offset] of [['nodes',0x84],['nodes',0xc4],['nodes',0x104],['records',8],['proxy',0x14],['envelope',4]]){const r=[...original],index=r.findIndex(x=>x.phase==='controller-graph-after');r[index]=structuredClone(r[index]);const e=r[index];if(field==='nodes'||field==='records'){const b=Buffer.from(e[field][0].hex,'hex');b[offset]^=1;e[field][0].hex=b.toString('hex');}else{const b=Buffer.from(e[field],'hex');b[offset]^=1;e[field]=b.toString('hex');}assert.throws(()=>analyzeAiControllerGraph(r,options()),/Complete controller/);}
 assert.throws(()=>analyzeAiControllerGraph(rows().filter(r=>r.phase!=='controller-graph-after'),options()),/Missing complete graph boundary/);
 assert.throws(()=>analyzeAiControllerGraph(rows().filter(r=>!r.phase.startsWith('contact-response')),options()),/Retained jump entry 126 field b4c/);
});
