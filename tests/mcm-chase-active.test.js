import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseActiveChain} from '../scripts/mcm-reference/compare-chase-active-chain.mjs';
import {analyzeLiveChaseActive} from '../scripts/mcm-reference/analyze-live-chase-active.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-active-chain-wine11.json.br',import.meta.url))));
test('active eye/reset/camera chain matches 13824 original retained updates',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseActiveChain(input,output),{cases:3456,steps:13824,words:622080,active:4032,bypassed:9792,resets:384,differences:0,examples:[]});
 output[160]^=1;assert.equal(compareChaseActiveChain(input,output).differences,1);
 assert.throws(()=>compareChaseActiveChain(input,output.subarray(0,-1)),/Incomplete/);
});
test('active eye construction feeds retained filters and camera state in 80 live updates',()=>{
 assert.deepEqual(analyzeLiveChaseActive(fixture.live),{pairs:80,words:3760,active:80,bypassed:0,resets:0,modes:[0]});
});
test('live active-chain audit rejects camera reseeding, output corruption and missing exits',()=>{
 const reseeded=structuredClone(fixture.live);reseeded.filter(r=>r.phase==='before')[1].inputs[28]^=1;
 assert.throws(()=>analyzeLiveChaseActive(reseeded),/Retained camera state differs/);
 const changed=structuredClone(fixture.live);changed.find(r=>r.phase==='after').inputs[33]^=1;
 assert.throws(()=>analyzeLiveChaseActive(changed),/Native camera state differs/);
 const result=structuredClone(fixture.live);result.find(r=>r.phase==='after').result[3]^=1;
 assert.throws(()=>analyzeLiveChaseActive(result),/Native result differs/);
 assert.throws(()=>analyzeLiveChaseActive(fixture.live.slice(0,-1)),/Incomplete/);
});
