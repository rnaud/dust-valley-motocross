import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeTerrainMergedStores} from '../scripts/mcm-reference/analyze-terrain-merged-stores.mjs';
import {analyzeWorldWriters,worldWriterPhases} from '../scripts/mcm-reference/analyze-world-writers.mjs';
import {analyzeSceneActorDraws,sceneActorPhases} from '../scripts/mcm-reference/analyze-scene-actor-draws.mjs';
import {analyzeMovingVisibility} from '../scripts/mcm-reference/analyze-moving-visibility.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-merged-world-writers-wine11.json.br',import.meta.url))));

test('native terrain merged points produce the overlapping stack write and preserve unused slots',()=>{
 const f=fixture(),r=analyzeTerrainMergedStores(f.render);
 assert.equal(r.calls,12);assert.equal(r.words,501);
 const overlaps=[...r.stores].flatMap(([index,stores])=>stores.filter(s=>s.address===f.world.scratch).map(s=>({index,...s})));
 assert.equal(overlaps.length,1);assert.equal(overlaps[0].value,1093338000);
 const later=[...r.stores].filter(([index])=>index>overlaps[0].index);
 assert.ok(later.length>0,'A later short leaf query reuses the stack');
 assert.ok(later.every(([,stores])=>stores.every(s=>s.address!==f.world.scratch)),'Unused merged slots must not be cleared');
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);
 assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,291);
 assert.equal(f.controlled.filter(r=>r.phase==='controlled-terrain-input').length,1);
 assert.deepEqual(f.controlled.filter(r=>r.phase==='controlled-terrain-restored').map(r=>r.verified),[1]);
});

test('native point observations cannot replace missing inputs or corrupted computed results',()=>{
 let f=fixture();f.render=f.render.filter(r=>r.phase!=='terrain-query-input');
 assert.throws(()=>analyzeTerrainMergedStores(f.render),/Missing terrain split inputs/);
 f=fixture();f.render.find(r=>r.phase==='terrain-merged-points').points[0]^=1;
 assert.throws(()=>analyzeTerrainMergedStores(f.render),/Computed terrain merged points/);
});

function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}

test('controlled scene query feeds five retained bike frames without observed scratch substitution',()=>{
 const f=fixture(),scene=analyzeSceneActorDraws(f.render.filter(r=>sceneActorPhases.has(r.phase)),f.world.ownerDrawTarget);
 const actorDrawSchedules=new Map(scene.reports.map(r=>[r.frame,r.wrappers]));
 const run=render=>analyzeWorldWriters(render.filter(r=>worldWriterPhases.has(r.phase)),f.rows,{...f.world,actorDrawSchedules});
 const writers=run(f.render);assert.deepEqual(writers,f.writers);
 assert.equal(writers.checks.at(-1).kind,'terrainMerged');
 assert.throws(()=>run(f.render.filter(r=>!r.phase.startsWith('terrain-'))),e=>e.code==='ERR_ASSERTION'&&e.actual===f.mismatch.actual&&e.expected===f.mismatch.expected);
 const byFrame=new Map(writers.checks.map(c=>[c.frame,{address:f.world.scratch,value:c.value}]));
 f.input.terrain=terrain();
 const result=analyzeMovingVisibility(f.input,f.rows,f.events,f.render.filter(r=>['wrapper','wrapper-cull','store-before','store-after'].includes(r.phase)),Float32Array.from(f.world.worldMatrix),{worldCallerWrites:({frame})=>byFrame.has(frame)?[byFrame.get(frame)]:[]});
 assert.equal(result.bikeFrames,5);assert.equal(result.riderTicks,4);
 assert.equal(result.physicsDifferences,0);assert.equal(result.observedCallerScratchWords,0);
});
