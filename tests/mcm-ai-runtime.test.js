import {analyzeAiRuntime} from '../scripts/mcm-reference/analyze-ai-runtime.mjs';
import {advanceMcmAiController} from '../src/physics/mcm/ai-controller.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-controller-graph').live.trim().split('\n').map(JSON.parse);
function options(){const f=read('ai-final-controls'),bytes=fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url));assert.equal(hash(bytes),f.provenance.assetSha256);const {terrain:t}=JSON.parse(gunzipSync(bytes)),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(i=>i===null?null:node(i));return n;};return {...f.configuration,terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale}};}
const runtimeRows=()=>rows().filter(r=>['route','before','after','controller-graph-before','controller-graph-after','random','race-context','actors','second-actors'].includes(r.phase));
test('runtime controller matches 159 original calls without intermediate control or event snapshots',()=>{
 const f=read('ai-controller-graph');assert.equal(hash(f.live),f.provenance.liveSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,28);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
 assert.deepEqual(analyzeAiRuntime(runtimeRows(),options()),{calls:159,tricks:1,rotations:103,graphNodes:1272,randomDraws:92});
});
test('runtime validation rejects changed final body, graph and RNG observations',()=>{
 const r=runtimeRows(),e=r.find(r=>r.phase==='after'),body=Buffer.from(e.hex,'hex');body[0x6f4]^=1;e.hex=body.toString('hex');assert.throws(()=>analyzeAiRuntime(r,options()),/Runtime body/);
 const graph=runtimeRows(),n=graph.find(r=>r.phase==='controller-graph-after').nodes[0],bytes=Buffer.from(n.hex,'hex');bytes[0x84]^=1;n.hex=bytes.toString('hex');assert.throws(()=>analyzeAiRuntime(graph,options()),/Runtime graph/);
 const random=runtimeRows();random.find(r=>r.phase==='random'&&r.inAi).state^=1;assert.throws(()=>analyzeAiRuntime(random,options()),/Runtime shared random state/);
});
test('unvalidated runtime modes and nearby interaction cannot silently enter the controller',()=>{
 const bytes=new Uint8Array(0xcc8),body=new DataView(bytes.buffer);body.setUint32(0xaf0,1,true);body.setUint32(0xbf8,1,true);const c={body,route:{nodes:new Map(),table:[]}};
 assert.throws(()=>advanceMcmAiController(c,{mode:1},.02),/Unvalidated runtime AI mode/);
 assert.throws(()=>advanceMcmAiController(c,{mode:0},.02),/Unvalidated runtime nearby/);
 assert.equal(body.getUint32(0xb04,true),0);
});
test('empty-route runtime exit preserves the body except original throttle and brake writes',()=>{
 const bytes=new Uint8Array(0xcc8).fill(0x55),body=new DataView(bytes.buffer);body.setUint32(0xaf0,0,true);const expected=bytes.slice(),e=new DataView(expected.buffer);e.setUint32(0xb04,0,true);e.setUint32(0xb08,0x3f800000,true);
 assert.deepEqual(advanceMcmAiController({body,route:{nodes:new Map(),table:[]}},{mode:0},.02),{status:'empty-route',result:0});assert.deepEqual(bytes,expected);
});

test('runtime outputs depend on entry graph and selected animation resources',()=>{
 const r=runtimeRows(),entry=r.find(x=>x.phase==='controller-graph-before'),node=entry.nodes.find(n=>n.address===entry.root),bytes=Buffer.from(node.hex,'hex');bytes[0xb4]^=1;node.hex=bytes.toString('hex');assert.throws(()=>analyzeAiRuntime(r,options()),/Runtime graph/);
 const changed=runtimeRows();changed.find(x=>x.phase==='controller-graph-before'&&x.sequence===155).animations[7][3]^=1;assert.throws(()=>analyzeAiRuntime(changed,options()),/Runtime rider animation/);
});
test('route loader observes the original jump increment before controls are cleared',()=>{
 const body=new DataView(new ArrayBuffer(0xcc8));
 for(const [offset,value] of [[0xaf0,1],[0xb00,1],[0xb6c,1],[0xc44,0xffffffff],[0xb04,0x3f800000],[0xb08,0x3f000000]])body.setUint32(offset,value,true);
 const stop=new Error('stop at loader boundary');let calls=0;
 assert.throws(()=>advanceMcmAiController({body,route:{nodes:new Map(),table:[1]}},{mode:0,routeDataLoaded:0,loadRouteData(){calls++;assert.equal(body.getUint32(0xc44,true),0);assert.equal(body.getUint32(0xb04,true),0x3f800000);assert.equal(body.getUint32(0xb08,true),0x3f000000);throw stop;}},.02),error=>error===stop);
 assert.equal(calls,1);
});
