import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeSceneActorDraws,sceneActorPhases} from '../scripts/mcm-reference/analyze-scene-actor-draws.mjs';import {analyzeWorldWriters,worldWriterPhases} from '../scripts/mcm-reference/analyze-world-writers.mjs';
test('long native scene projection preserves the unresolved next-bike stack overwrite',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-world-negative-wine11.json.br',import.meta.url))));
 const scene=analyzeSceneActorDraws(f.render.filter(r=>sceneActorPhases.has(r.phase)),f.world.ownerDrawTarget);assert.ok(scene.reports.length>=40);
 const actorDrawSchedules=new Map(scene.reports.map(r=>[r.frame,r.wrappers]));
 assert.throws(()=>analyzeWorldWriters(f.render.filter(r=>worldWriterPhases.has(r.phase)),f.rows,{...f.world,actorDrawSchedules}),e=>e.code==='ERR_ASSERTION'&&e.message.startsWith('Next bike entry differs from predicted last writer')&&e.actual===0x110000&&e.expected===0x22f0b8);
 const before=f.failureBoundary.find(r=>r.phase==='handler-199094'),after=f.failureBoundary.find(r=>r.phase==='handler-1990dc');assert.equal(before.esp,0x22f088);assert.equal(after.esp,before.esp);assert.equal(before.value,0x110000);assert.equal(after.value,0x22f0b8);assert.equal(after.scratch,0x22f038);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.match(f.provenance.run,/captured=84 status=1/);
});
