import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiAvoidanceScanCases} from '../scripts/mcm-reference/ai-avoidance-scan-cases.mjs';
import {analyzeAiAvoidanceScan} from '../scripts/mcm-reference/analyze-ai-avoidance-scan.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-avoidance-scan-wine11.json.br',import.meta.url)))),hash=b=>createHash('sha256').update(b).digest('hex'),rows=()=>fixture().live.trim().split('\n').map(JSON.parse);
test('complete avoidance scan matches five output words in 4096 repeated original executions',()=>{
 const f=fixture(),{input,expected}=generateAiAvoidanceScanCases(),native=Buffer.from(f.native,'base64');assert.equal(input.length,4096*428);assert.equal(native.length,4096*20);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
 const flags=[0,0,0];let adjusted=0,fallback=0;for(let i=0;i<4096;i++){flags[native.readUInt32LE(i*20+16)]++;if(native.readUInt32LE(i*20+12))adjusted++;if(native.readFloatLE(i*20+8)!==160)fallback++;}assert.deepEqual(flags,[1233,1703,1160]);assert.equal(adjusted,2863);assert.equal(fallback,1215);
});
test('live scan derives all inputs through retained route guidance and earlier actor state',()=>{
 const f=fixture();assert.equal(hash(f.live),f.provenance.liveSha256);assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,9);
 const r=analyzeAiAvoidanceScan(rows());assert.equal(r.calls,64);assert.equal(r.scans,40);assert.equal(r.skipped,24);assert.equal(r.targetAdvances,30);
});
test('scan rejects altered native outputs and intermediate inputs instead of seeding from them',()=>{
 let r=rows();r.find(r=>r.phase==='scan-after').stack[11]^=1;assert.throws(()=>analyzeAiAvoidanceScan(r),/Computed scan output/);
 r=rows();r.find(r=>r.phase==='scan-before').stack[0x40/4]^=1;assert.throws(()=>analyzeAiAvoidanceScan(r),/Computed scan input/);
 r=rows();r.find(r=>r.phase==='scan-before').stack[0x8c/4]^=1;assert.throws(()=>analyzeAiAvoidanceScan(r),/Computed scan input/);
 r=rows();const sequence=r.find(r=>r.phase==='scan-before').sequence,entry=r.find(r=>r.phase==='before'&&r.sequence===sequence),b=Buffer.from(entry.hex,'hex');b.writeUInt32LE(1,0xbfc);entry.hex=b.toString('hex');assert.throws(()=>analyzeAiAvoidanceScan(r),/Computed scan input/);
});
