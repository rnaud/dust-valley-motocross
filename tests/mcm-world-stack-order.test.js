import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {analyzeWorldStackOrder} from '../scripts/mcm-reference/analyze-world-stack-order.mjs';
const {rows}=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-stack-order-wine11.json.br',import.meta.url))));
test('native ordered world capture retains HUD clock and exposes unmodeled caller writes',()=>{
 const r=analyzeWorldStackOrder(rows);
 assert.equal(r.playerUpdates,200);assert.equal(r.aiUpdates,200);
 assert.equal(r.clockComparison.comparedWords,1200);assert.deepEqual(r.clockComparison.differences,[]);
 assert.equal(r.clockComparison.predictedRefreshes,10);assert.equal(r.drawCalls,20);assert.equal(r.drawClears,6);
 assert.equal(r.unresolvedIntervals,199);
 assert.equal(r.transitions['after -> bike-entry'],199);
 assert.equal(r.transitions['bike-entry -> bike-before'],undefined);
});
test('ordered capture rejects missing returns and contradictory refresh timing',()=>{
 assert.throws(()=>analyzeWorldStackOrder(rows.slice(0,-1)),/Incomplete/);
 const wrong=structuredClone(rows);wrong.find(r=>r.phase==='before').elapsedBits=0x3f000000;
 assert.throws(()=>analyzeWorldStackOrder(wrong),/Predicted refresh/);
 const truncated=structuredClone(rows);truncated.splice(1,1);truncated.forEach((r,i)=>r.sequence=i);
 assert.throws(()=>analyzeWorldStackOrder(truncated),/Unpaired bike/);
});
