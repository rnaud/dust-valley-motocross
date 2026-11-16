import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeGridTrace} from '../scripts/mcm-reference/analyze-grid-trace.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-all-grid-wine11.json.br',import.meta.url))));
const checkpoint=JSON.parse(fixture.files['checkpoint.json']),collision=JSON.parse(fixture.files['collision.json']);
const rows=()=>fixture.files['grid.jsonl'].trim().split('\n').map(JSON.parse);
test('all-actor grid trace retains links across 78 original calls',()=>{
 for(const [name,value] of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,44);
 assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const result=analyzeGridTrace(checkpoint,collision,rows());
 assert.equal(result.calls.length,78);assert.equal(result.words,3849768);assert.deepEqual(result.differences,[]);
 assert.equal(new Set(result.calls.map(c=>c.collider)).size,4);
});
test('later observed links are assertions, never replay inputs',()=>{
 const trace=rows(),b=Buffer.from(trace[1].objects[0].entriesHex,'hex');b[0]^=1;trace[1].objects[0].entriesHex=b.toString('hex');
 const result=analyzeGridTrace(checkpoint,collision,trace);assert.equal(result.differences.length,1);assert.equal(result.differences[0].sequence,1);
});
test('missing external rider update exposes retained grid divergence',()=>{
 const trace=rows(),index=trace.findIndex(r=>r.collider===0x1b0e160);assert.ok(index>=0);
 trace.splice(index,2);trace.forEach((r,i)=>r.sequence=i);
 assert.ok(analyzeGridTrace(checkpoint,collision,trace).differences.length>0);
});
test('incomplete returns and changed identities reject grid evidence',()=>{
 assert.throws(()=>analyzeGridTrace(checkpoint,collision,rows().slice(0,-1)),/Incomplete grid call/);
 const trace=rows();trace[1].caller^=1;assert.throws(()=>analyzeGridTrace(checkpoint,collision,trace));
});
