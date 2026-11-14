import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChasePreparation} from '../scripts/mcm-reference/compare-chase-preparation.mjs';
import {analyzeLiveChasePreparation} from '../scripts/mcm-reference/analyze-live-chase-preparation.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-preparation-wine11.json.br',import.meta.url))));
test('target initialization and retained smoothing match original execution across modes and actor types',()=>{
 for(const joined of [false,true]){
  const input=Buffer.from(fixture[joined?'joinedInputHex':'inputHex'],'hex'),output=Buffer.from(fixture[joined?'joinedOutputHex':'outputHex'],'hex');
  assert.deepEqual(compareChasePreparation(input,output,{joined}),{cases:320,steps:joined?3200:320,words:joined?118400:9920,differences:0,examples:[]});
  output[0]^=1;assert.equal(compareChasePreparation(input,output,{joined}).differences,1);
  assert.throws(()=>compareChasePreparation(input,output.subarray(0,-1),{joined}),/Incomplete/);
 }
});
test('computed preparation targets feed retained filters across 80 live original updates',()=>{
 const result=analyzeLiveChasePreparation(fixture.live);
 assert.equal(result.pairs,80);assert.equal(result.words,2880);assert.equal(result.shortUpdates,480);assert.equal(result.gradualChanges,2);
 assert.deepEqual(result.modes,[0]);assert.deepEqual(result.actorTypes,[3]);
});
test('combined live audit rejects changed upstream inputs, reseeding and missing exits',()=>{
 const changed=structuredClone(fixture.live);changed[0].inputs[0]^=0x00800000;
 assert.throws(()=>analyzeLiveChasePreparation(changed),/Target changed|output differs|result differs/);
 const reseeded=structuredClone(fixture.live);reseeded.filter(r=>r.phase==='before')[1].filters[0]^=1;
 assert.throws(()=>analyzeLiveChasePreparation(reseeded),/Retained smoothing state differs/);
 assert.throws(()=>analyzeLiveChasePreparation(fixture.live.slice(0,-1)),/Incomplete/);
});
