import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeWorldWriters,worldWriterPhases} from '../scripts/mcm-reference/analyze-world-writers.mjs';
import {analyzeSceneActorDraws,sceneActorPhases} from '../scripts/mcm-reference/analyze-scene-actor-draws.mjs';
import {analyzeMovingVisibility} from '../scripts/mcm-reference/analyze-moving-visibility.mjs';
const read=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/sampler-world-writers-wine11.json.br',import.meta.url))));
function run(f,withoutSampler=false){
 const scene=analyzeSceneActorDraws(f.render.filter(r=>sceneActorPhases.has(r.phase)),f.world.ownerDrawTarget);
 const actorDrawSchedules=new Map(scene.reports.map(r=>[r.frame,r.wrappers]));
 return analyzeWorldWriters(f.render.filter(r=>worldWriterPhases.has(r.phase)&&(!withoutSampler||!r.phase.startsWith('shader-'))),f.rows,{...f.world,actorDrawSchedules});
}
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('computed sampler writes close the captured interval-23 carry failure',()=>{
 const f=read(),r=run(f);
 assert.equal(r.checks.length,41);assert.equal(r.samplerFormatCalls,8);assert.equal(r.samplerSaveCalls,16);assert.equal(r.counts.sampler,16);
 assert.deepEqual(r.checks[23],{kind:'sampler',frame:23,value:0,nextFrame:24});
 assert.throws(()=>run(f,true),e=>e.code==='ERR_ASSERTION'&&e.message.startsWith('Next bike entry differs from predicted last writer')&&e.actual===1064518239&&e.expected===0);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,270);
});
test('sampler-inclusive world writes feed retained physics without observed scratch',()=>{
 const f=read(),writers=run(f),byFrame=new Map(writers.checks.map(c=>[c.frame,{address:f.world.scratch,value:c.value}]));f.input.terrain=terrain();
 const render=f.render.filter(r=>['wrapper','wrapper-cull','store-before','store-after'].includes(r.phase));
 const r=analyzeMovingVisibility(f.input,f.rows,f.events,render,Float32Array.from(f.world.worldMatrix),{worldCallerWrites:({frame})=>byFrame.has(frame)?[byFrame.get(frame)]:[]});
 assert.equal(r.bikeFrames,42);assert.equal(r.riderTicks,41);assert.equal(r.physicsDifferences,0);
 assert.equal(r.callerScratchMode,'modeled-world');assert.equal(r.modeledCallerScratchWords,41);assert.equal(r.observedCallerScratchWords,0);
 assert.match(r.physicsScope,/invocation order and graphics state inputs are not fully recovered/);
});
