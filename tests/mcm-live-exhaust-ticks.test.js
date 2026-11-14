import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveExhaustTicks} from '../scripts/mcm-reference/compare-live-exhaust-ticks.mjs';
import {floatBits} from '../src/physics/mcm/math.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-exhaust-ticks-wine11.json.br',import.meta.url))));
test('live separate exhaust ticks match original particle writes and actual timing',()=>{
 const rows=fixture(),reports=compareLiveExhaustTicks(rows);
 assert.deepEqual(reports.map(r=>r.frame),[50,51]);assert.deepEqual(reports.map(r=>r.emitted),[1,2]);
 assert.equal(reports.reduce((n,r)=>n+r.words,0),28578);assert.ok(reports.every(r=>r.differences.length===0));
 for(const row of rows)row.dtBits=floatBits(.02);
 assert.ok(compareLiveExhaustTicks(rows).some(r=>r.differences.length>0),'Bike timestep cannot replace actor timestep');
 assert.throws(()=>compareLiveExhaustTicks([]),/complete/);
 const wrong=fixture();wrong[1].playerActive=1;assert.throws(()=>compareLiveExhaustTicks(wrong),/trace pair/);
});
