import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeFixedProgramChain} from '../scripts/mcm-reference/analyze-fixed-program-chain.mjs';
import {analyzeSamplerFormatter,samplerFormatterPhases} from '../scripts/mcm-reference/analyze-sampler-formatter.mjs';
import {analyzeWorldWriters,worldWriterPhases} from '../scripts/mcm-reference/analyze-world-writers.mjs';
import {analyzeSceneActorDraws,sceneActorPhases} from '../scripts/mcm-reference/analyze-scene-actor-draws.mjs';
import {analyzeMovingVisibility} from '../scripts/mcm-reference/analyze-moving-visibility.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
function shader(){
 const f=read('fixed-pixel-insertion-live');
 f.rows=f.rows.map(r=>r.nodesSnapshot===undefined?r:{...r,nodes:f.snapshots[r.nodesSnapshot]});
 return f;
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('live misses insert computed pixel descriptors and retain the resulting native trees',()=>{
 const f=shader(),before=digest(f.snapshots),r=analyzeFixedProgramChain(f.rows);
 assert.deepEqual(r,f.result);assert.equal(r.keys,235);assert.equal(r.pixel.creations,2);
 assert.equal(r.pixel.creations,r.pixel.misses);assert.equal(r.pixel.keyWords,r.pixel.inputs);
 assert.equal(r.cache.comparisons,3210);assert.equal(r.cache.misses,2);
 assert.deepEqual(analyzeSamplerFormatter(f.rows),f.formatter);
 assert.equal(f.formatter.bindings,r.cache.samplerCalls);assert.equal(f.formatter.formats,16);
 assert.equal(digest(f.snapshots),before,'Insertion must not mutate captured snapshots');
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
 assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,278);
});
test('creation requires allocation and compilation inputs, computed key bytes and initial colors',()=>{
 let f=shader();f.rows=f.rows.filter(r=>r.phase!=='shader-d5aaa');
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Missing allocation or compiled shader boundary/);
 f=shader();f.rows=f.rows.filter(r=>r.phase!=='shader-d6740');
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Missing allocation or compiled shader boundary/);
 f=shader();f.rows.find(r=>r.phase==='fixed-pixel-created').key[0]^=1;
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Created pixel descriptor/);
 f=shader();delete f.rows.find(r=>r.phase==='fixed-pixel-cache').nodes[0].flags;
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Missing initial cache parent\/color metadata/);
});
test('post-insertion topology and colors are checked rather than accepted as a fresh cache',()=>{
 const f=shader(),i=f.rows.findIndex(r=>r.phase==='fixed-pixel-created'),created=f.rows[i];
 const snapshot=f.rows.slice(i+1).find(r=>r.phase==='fixed-pixel-cache');
 snapshot.nodes.find(n=>n.id===created.node).flags^=1;
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Fixed pixel cache changed without modeled insertion/);
});
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('the same cache-miss and formatter trace feeds 42 retained bike frames without observed scratch',()=>{
 const f=read('fixed-pixel-world-writers'),s=shader(),chain=analyzeFixedProgramChain(s.rows);
 assert.equal(f.provenance.renderSha256,s.provenance.renderSha256);
 assert.equal(f.provenance.framesSha256,s.provenance.framesSha256);
 assert.deepEqual(f.render.filter(r=>samplerFormatterPhases.has(r.phase)),s.rows.filter(r=>samplerFormatterPhases.has(r.phase)));
 const scene=analyzeSceneActorDraws(f.render.filter(r=>sceneActorPhases.has(r.phase)),f.world.ownerDrawTarget);
 const actorDrawSchedules=new Map(scene.reports.map(r=>[r.frame,r.wrappers]));
 const run=render=>analyzeWorldWriters(render.filter(r=>worldWriterPhases.has(r.phase)),f.rows,{...f.world,actorDrawSchedules});
 const writers=run(f.render);assert.equal(writers.samplerFormatCalls,chain.cache.samplerFormats);
 assert.throws(()=>run(f.render.filter(r=>!r.phase.startsWith('shader-'))),e=>e.code==='ERR_ASSERTION'&&e.actual===f.mismatch.actual&&e.expected===f.mismatch.expected);
 const byFrame=new Map(writers.checks.map(c=>[c.frame,{address:f.world.scratch,value:c.value}]));
 f.input.terrain=terrain();
 const r=analyzeMovingVisibility(f.input,f.rows,f.events,f.render.filter(r=>['wrapper','wrapper-cull','store-before','store-after'].includes(r.phase)),Float32Array.from(f.world.worldMatrix),{worldCallerWrites:({frame})=>byFrame.has(frame)?[byFrame.get(frame)]:[]});
 assert.equal(r.bikeFrames,42);assert.equal(r.riderTicks,41);assert.equal(r.physicsDifferences,0);
 assert.equal(r.modeledCallerScratchWords,41);assert.equal(r.observedCallerScratchWords,0);
 assert.equal(f.rows[40].requestedSteerBits,0xbe800000);
 assert.equal(f.rows[78].requestedThrottle,1);assert.equal(f.rows[80].requestedThrottle,0);assert.equal(f.rows[82].requestedThrottle,0);
});
