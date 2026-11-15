import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeUploadCopy} from '../scripts/mcm-reference/analyze-upload-copy.mjs';
import {analyzeSceneActorDraws,sceneActorPhases} from '../scripts/mcm-reference/analyze-scene-actor-draws.mjs';
import {analyzeWorldWriters,worldWriterPhases} from '../scripts/mcm-reference/analyze-world-writers.mjs';
const read=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-copy-negative-wine11.json.br',import.meta.url))));
test('joined native copy trace retains the later indexed-draw zero overwrite',()=>{
 const f=read(),copies=analyzeUploadCopy(f.render, f.world.moduleBase);assert.ok(copies.calls>1500);
 const scene=analyzeSceneActorDraws(f.render.filter(r=>sceneActorPhases.has(r.phase)),f.world.ownerDrawTarget),actorDrawSchedules=new Map(scene.reports.map(r=>[r.frame,r.wrappers]));
 assert.throws(()=>analyzeWorldWriters(f.render.filter(r=>worldWriterPhases.has(r.phase)),f.rows,{...f.world,actorDrawSchedules}),e=>e.code==='ERR_ASSERTION'&&e.message.startsWith('Next bike entry differs from predicted last writer')&&e.actual===1063966230&&e.expected===0);
 const pairs=[];let before;for(const r of f.drawTail){if(r.phase==='ddraw-ebfe')before=r;if(r.phase==='ddraw-ec3d'&&before&&before.esp===r.esp&&before.value!==r.value)pairs.push([before,r]);}
 assert.ok(pairs.some(([a,b])=>a.value===1063966230&&b.value===0&&a.esp===0x22f808));
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,176);assert.match(f.provenance.run,/captured=84 status=1/);
});
test('complete initial intervals include computed copy saves without observed scratch substitution',()=>{
 const f=read(),end=f.render.findIndex(r=>r.phase==='bike-function-entry'&&r.ecx===f.world.player&&r.frame===7);assert.ok(end>=0);
 const r=analyzeWorldWriters(f.render.slice(0,end+1).filter(r=>worldWriterPhases.has(r.phase)),f.rows.slice(0,18),f.world);
 assert.equal(r.checks.length,8);assert.ok(r.uploadCopyCalls>300);
});

test('deeper indexed trace still rejects the unresolved shader callback carry',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/indexed-world-negative-wine11.json.br',import.meta.url))));
 const scene=analyzeSceneActorDraws(f.render.filter(r=>sceneActorPhases.has(r.phase)),f.world.ownerDrawTarget),actorDrawSchedules=new Map(scene.reports.map(r=>[r.frame,r.wrappers]));
 assert.throws(()=>analyzeWorldWriters(f.render.filter(r=>worldWriterPhases.has(r.phase)),f.rows,{...f.world,actorDrawSchedules}),e=>e.code==='ERR_ASSERTION'&&e.message.startsWith('Next bike entry differs from predicted last writer')&&e.actual===1064500121&&e.expected===0);
});
