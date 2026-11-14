import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseSmoothing} from '../scripts/mcm-reference/compare-chase-smoothing.mjs';
import {analyzeLiveChaseSmoothing} from '../scripts/mcm-reference/analyze-live-chase-smoothing.mjs';
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-smoothing-wine11.json.br',import.meta.url))));
test('six retained chase filters match 4160 original updates including invalid-result bits',()=>{
 const input=Buffer.from(f.inputHex,'hex'),output=Buffer.from(f.outputHex,'hex');
 assert.deepEqual(compareChaseSmoothing(input,output),{cases:192,steps:4160,words:124800,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseSmoothing(input,output).differences,1);
 assert.throws(()=>compareChaseSmoothing(input,output.subarray(0,-1)),/Incomplete/);
});
test('live smoothing remains retained across idle and moving target sequences',()=>{
 const idle=analyzeLiveChaseSmoothing(f.idle),pulse=analyzeLiveChaseSmoothing(f.pulse);
 assert.equal(idle.pairs,40);assert.equal(idle.words,1200);assert.equal(idle.shortUpdates,240);assert.equal(idle.gradualChanges,0);
 assert.equal(pulse.pairs,160);assert.equal(pulse.words,4800);assert.equal(pulse.shortUpdates,960);assert.equal(pulse.gradualChanges,6);
});
test('live smoothing audit rejects reseeding, changed identities and incomplete pairs',()=>{
 const changed=structuredClone(f.pulse);changed.filter(r=>r.phase==='before')[1].filters[0]^=1;
 assert.throws(()=>analyzeLiveChaseSmoothing(changed),/Retained smoothing state differs/);
 const identity=structuredClone(f.pulse);identity.filter(r=>r.phase==='before')[1].pointers[0]+=4;
 assert.throws(()=>analyzeLiveChaseSmoothing(identity),/identity changed/);
 const output=structuredClone(f.pulse);output.find(r=>r.phase==='after').result[0]^=1;
 assert.throws(()=>analyzeLiveChaseSmoothing(output),/Native smoothing result differs/);
 assert.throws(()=>analyzeLiveChaseSmoothing(f.pulse.slice(0,-1)),/Incomplete/);
});
