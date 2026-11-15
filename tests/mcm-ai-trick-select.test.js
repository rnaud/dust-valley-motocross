import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiTrickSelectCases} from '../scripts/mcm-reference/ai-trick-select-cases.mjs';import {analyzeAiTrickSelect} from '../scripts/mcm-reference/analyze-ai-trick-select.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),fixture=()=>read('ai-trick-select'),live=()=>read('ai-jump-state'),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>live().live.trim().split('\n').map(JSON.parse);
test('AI trick selection and delay match 4096 repeated original executions',()=>{
 const f=fixture(),{input,expected}=generateAiTrickSelectCases(),native=Buffer.from(f.native,'base64');assert.equal(input.length,4096*24);assert.equal(native.length,4096*20);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('live jump and trick dispatch predict all 127 AI draws, 2 selections and 13 rejections',()=>{
 const f=fixture(),l=live();assert.equal(hash(l.live),f.provenance.liveSha256);assert.match(l.provenance.cleanup,/debugger=0 clean=1/);assert.equal((l.provenance.cleanup.match(/restored=1/g)||[]).length,17);assert.deepEqual(analyzeAiTrickSelect(rows()),{calls:256,draws:127,allDraws:138,selections:2,rejected:13});
});
test('live reconstruction rejects altered selection, trick flag and random consumer',()=>{
 let r=rows(),sequence=r.find(x=>x.phase==='random'&&x.caller===0x49d741).sequence,o=r.find(x=>x.phase==='steering-control-before'&&x.sequence===sequence),b=Buffer.from(o.hex,'hex');b[0x814]^=1;o.hex=b.toString('hex');assert.throws(()=>analyzeAiTrickSelect(r),/Selected trick animation/);
 r=rows();o=r.find(x=>x.phase==='steering-control-before'&&x.sequence===sequence);b=Buffer.from(o.hex,'hex');b.writeUInt32LE(1,0xb4c);o.hex=b.toString('hex');assert.throws(()=>analyzeAiTrickSelect(r),/field b4c/);
 r=rows();r.find(x=>x.phase==='random'&&x.caller===0x49d741).caller=0x46f10b;assert.throws(()=>analyzeAiTrickSelect(r),/random consumer/);
 r=rows();r.find(x=>x.phase==='random'&&!x.inAi).inAi=1;assert.throws(()=>analyzeAiTrickSelect(r),/Unmodeled AI random draw/);
});
