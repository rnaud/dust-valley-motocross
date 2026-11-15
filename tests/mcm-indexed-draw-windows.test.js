import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import{analyzeIndexedDrawWindows}from'../scripts/mcm-reference/analyze-indexed-draw-windows.mjs';
test('indexed draw census retains the native zero transition and rejects missing returns',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-copy-negative-wine11.json.br',import.meta.url)))),r=analyzeIndexedDrawWindows(f.drawTail);
 assert.equal(r.pendingDraws,0);assert.equal(r.unpairedReturns,0);assert.deepEqual(r.changes,[{frame:8,before:'ddraw-ebfe',after:'ddraw-ec3d',esp:0x22f808,from:1063966230,to:0}]);
 const broken=f.drawTail.filter(x=>!(x.phase==='ddraw-ec3d'&&x.esp===0x22f808));const b=analyzeIndexedDrawWindows(broken);assert.equal(b.pendingDraws,1);
});

test('213-site trace localizes both zero overwrites to one backend callback',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/indexed-world-negative-wine11.json.br',import.meta.url)))),r=analyzeIndexedDrawWindows(f.render);
 assert.equal(r.completeDraws,8256);assert.equal(r.unpairedReturns,0);assert.equal(r.pendingDraws,0);
 assert.deepEqual(r.changes,[22,23].map((frame,i)=>({frame,before:'indexed-62a32',after:'indexed-62a52',esp:2291328,from:[1064500121,1064518239][i],to:0})));
 assert.equal(r.visitedStages['indexed-62400'],8256);assert.equal(r.visitedStages['indexed-62a32'],8256);assert.equal(r.visitedStages['indexed-62a52'],8256);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,213);assert.match(f.provenance.run,/captured=84 status=1/);
 const damaged=structuredClone(f.render);damaged.find(x=>x.frame===22&&x.phase==='indexed-62a52'&&x.esp===2291328).value=1;assert.notDeepEqual(analyzeIndexedDrawWindows(damaged).changes,r.changes);
});

test('232-site shader trace isolates the zero write to program selection',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/shader-draw-windows-wine11.json.br',import.meta.url)))),r=analyzeIndexedDrawWindows(f.render);
 assert.equal(r.completeDraws,8338);assert.equal(r.pendingDraws,0);assert.equal(r.unpairedReturns,0);
 assert.deepEqual(r.changes,[{frame:23,before:'shader-dc5d7',after:'shader-dc601',esp:0x22f640,from:1064518239,to:0}]);
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,232);assert.match(f.provenance.run,/captured=84 status=1/);
});
