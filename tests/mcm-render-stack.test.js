import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {analyzeRenderStack} from '../scripts/mcm-reference/analyze-render-stack.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-stack-wine11.json.br',import.meta.url))));
test('native renderer overwrites caller scratch through multiple child paths',()=>{
 const r=analyzeRenderStack(fixture.rows);
 assert.equal(r.frames,19);assert.equal(r.calls,1292);assert.equal(r.changedFrames,19);assert.equal(r.maxDepth,5);
 assert.deepEqual(r.changedLeafCalls,{'0x00446220':19,'0x0044faf0':38,'0x00422f50':16,'0x0043b3a0':14});
 const before=fixture.outer.filter(x=>x.phase==='render1-before'),after=fixture.outer.filter(x=>x.phase==='render1-after');
 assert.equal(before.length,40);assert.equal(after.length,40);
 for(let i=0;i<40;i++){assert.equal(before[i].target,0x467a90);assert.equal(before[i].frame,after[i].frame);assert.notEqual(before[i].scratchBits,after[i].scratchBits);}
 const targets=fixture.target.filter(x=>x.phase==='at-00467c55');assert.equal(targets.length,9);assert.ok(targets.every(x=>x.target===0x4206c0));
});
test('render call analysis rejects missing returns and inconsistent stack identity',()=>{
 assert.throws(()=>analyzeRenderStack(fixture.rows.slice(0,-1)),/Incomplete/);
 const rows=structuredClone(fixture.rows),start=rows.findIndex(x=>x.phase==='at-00467fc8');rows[start+1].scratchAddress+=4;
 assert.throws(()=>analyzeRenderStack(rows),/Unpaired/);
});
