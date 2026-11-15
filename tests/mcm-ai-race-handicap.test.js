import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {generateAiRaceHandicapCases} from '../scripts/mcm-reference/ai-race-handicap-cases.mjs';
import {replayAiRaceHandicap} from '../scripts/mcm-reference/analyze-ai-race-handicap.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url)))),hash=x=>createHash('sha256').update(x).digest('hex'),rows=()=>read('ai-jump-state').live.trim().split('\n').map(JSON.parse);
test('race handicapping matches three outputs in 8192 repeated original executions',()=>{
 const f=read('ai-race-handicap'),{input,expected}=generateAiRaceHandicapCases(),native=Buffer.from(f.native,'base64');assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.equal(native.length,8192*12);assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(native),f.provenance.outputSha256);assert.equal(f.provenance.repeatSha256,f.provenance.outputSha256);assert.deepEqual(expected,native);
});
test('inactive race retains incoming scratch and computes unit scale for 256 live calls',()=>{
 const f=read('ai-race-handicap'),l=read('ai-jump-state');assert.equal(hash(l.live),f.provenance.liveSha256);assert.match(l.provenance.cleanup,/debugger=0 clean=1/);assert.equal((l.provenance.cleanup.match(/restored=1/g)||[]).length,17);const r=replayAiRaceHandicap(rows());assert.equal(r.calls,256);assert.ok(r.checks.every(x=>!x.raceActive&&x.scale===1));
});
test('handicap replay rejects changed progress and scale',()=>{
 let r=rows();r.find(x=>x.phase==='lookahead-after').stack[22]^=1;assert.throws(()=>replayAiRaceHandicap(r),/Computed handicap progress/);
 for(const phase of ['lookahead-after','after']){r=rows();const e=r.find(x=>x.phase===phase),b=Buffer.from(e.hex,'hex');b.writeUInt32LE(0x3f800001,0xba8);e.hex=b.toString('hex');assert.throws(()=>replayAiRaceHandicap(r),/handicap scale|Handicap scale/);}
});
