import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseOffsetChain} from '../scripts/mcm-reference/compare-chase-offset-chain.mjs';
import {analyzeLiveChaseOffset} from '../scripts/mcm-reference/analyze-live-chase-offset.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-offset-chain-wine11.json.br',import.meta.url))));
test('combined offset chain retains exact native filters across active and bypass branches',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseOffsetChain(input,output),{cases:640,steps:6400,words:256000,active:2800,bypassed:3600,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseOffsetChain(input,output).differences,1);
 assert.throws(()=>compareChaseOffsetChain(input,output.subarray(0,-1)),/Incomplete/);
});
test('computed offsets feed native targets and retained smoothing across 80 live updates',()=>{
 assert.deepEqual(analyzeLiveChaseOffset(fixture.live),{pairs:80,words:3120,active:80,bypassed:0,modes:[0]});
});
test('combined live audit rejects upstream corruption, reseeding and incomplete histories',()=>{
 const changed=structuredClone(fixture.live);changed[0].inputs[14]=0x3f800000;
 assert.throws(()=>analyzeLiveChaseOffset(changed),/Native targets differ|Native filters differ|Native result differs/);
 const reseeded=structuredClone(fixture.live);reseeded.filter(r=>r.phase==='before')[1].filters[0]^=1;
 assert.throws(()=>analyzeLiveChaseOffset(reseeded),/Retained filters differ/);
 const axis=structuredClone(fixture.live);axis.filter(r=>r.phase==='before')[1].inputs[20]^=1;
 assert.throws(()=>analyzeLiveChaseOffset(axis),/Retained shared axis differs/);
 assert.throws(()=>analyzeLiveChaseOffset(fixture.live.slice(0,-1)),/Incomplete/);
});
