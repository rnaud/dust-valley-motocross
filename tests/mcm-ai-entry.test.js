import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiEntryCases} from '../scripts/mcm-reference/ai-entry-cases.mjs';
import {generateAiRouteDataCases} from '../scripts/mcm-reference/ai-route-data-cases.mjs';
import {replayAiEntry} from '../scripts/mcm-reference/analyze-ai-entry.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-jump-state').live.trim().split('\n').map(JSON.parse);
test('startup and route-data loading match 8192 repeated original executions',()=>{
 const f=read('ai-entry');assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 for(const [name,generate,size] of [['entry',generateAiEntryCases,212],['route-data',generateAiRouteDataCases,156]]){const p=f.fixtures[name],{input,expected}=generate(),native=Buffer.from(p.native,'base64');assert.equal(native.length,4096*size);assert.equal(hash(input),p.inputSha256);assert.equal(hash(native),p.outputSha256);assert.equal(p.repeatSha256,p.outputSha256);assert.deepEqual(expected,native);}
});
test('startup computes eight stage outputs and retains the jump counter across 256 live calls',()=>{
 const f=read('ai-entry'),l=read('ai-jump-state');assert.equal(hash(l.live),f.provenance.liveSha256);assert.match(l.provenance.cleanup,/debugger=0 clean=1/);assert.equal((l.provenance.cleanup.match(/restored=1/g)||[]).length,17);
 const {checks,...summary}=replayAiEntry(rows());assert.equal(checks.length,256);assert.deepEqual(summary,{calls:256,increments:1});
});
test('startup rejects changed stage outputs and counter reseeding',()=>{
 let r=rows();r.find(x=>x.phase==='race-context').stack[29]^=1;assert.throws(()=>replayAiEntry(r),/Computed startup outputs/);
 r=rows();const entry=r.filter(x=>x.phase==='before')[1],b=Buffer.from(entry.hex,'hex');b.writeUInt32LE((b.readUInt32LE(0xc44)+1)>>>0,0xc44);entry.hex=b.toString('hex');assert.throws(()=>replayAiEntry(r),/Retained jump counter entry/);
 r=rows();const after=r.find(x=>x.phase==='after'),a=Buffer.from(after.hex,'hex');a.writeUInt32LE((a.readUInt32LE(0xc44)+1)>>>0,0xc44);after.hex=a.toString('hex');assert.throws(()=>replayAiEntry(r),/Retained jump counter exit/);
});
