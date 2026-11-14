import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseHeading} from '../scripts/mcm-reference/compare-chase-heading.mjs';
import {compareChaseHeadingChain} from '../scripts/mcm-reference/compare-chase-heading-chain.mjs';
import {analyzeLiveChaseHeadingChain} from '../scripts/mcm-reference/analyze-live-chase-heading-chain.mjs';
import {stepMcmHeadingChase} from '../src/physics/mcm/chase-heading.js';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-heading-wine11.json.br',import.meta.url))));
test('heading and enable gates match 2048 original boundary cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseHeading(input,output),{cases:2048,words:6144,paths:{active:1176,'alternate-eye':432,'rider-position':184,'fixed-target':256},differences:0,examples:[]});
 output[8]^=1;assert.equal(compareChaseHeading(input,output).differences,1);
 assert.throws(()=>compareChaseHeading(input,output.subarray(0,-1)),/Incomplete/);
});
test('actual active dispatch and mode4 settings match 10368 retained native updates',()=>{
 assert.deepEqual(compareChaseHeadingChain(Buffer.from(fixture.chainInputHex,'hex'),Buffer.from(fixture.chainOutputHex,'hex')),{cases:2592,steps:10368,words:508032,active:10368,bypassed:0,resets:288,differences:0,examples:[]});
});
test('live chain derives heading, angle and enable instead of consuming recorded locals',()=>{
 const expected={pairs:80,words:4160,active:80,bypassed:0,resets:0,modes:[0]};assert.deepEqual(analyzeLiveChaseHeadingChain(fixture.live),expected);
 const ignored=structuredClone(fixture.live);for(const r of ignored){r.inputs[16]=0x7fc00000;r.inputs[25]=0x7fc00000;r.inputs[19]=0;}
 assert.deepEqual(analyzeLiveChaseHeadingChain(ignored),expected);
 const changed=structuredClone(fixture.live);changed.filter(r=>r.phase==='before')[1].inputs[50]^=1;
 assert.throws(()=>analyzeLiveChaseHeadingChain(changed),/Retained camera state differs/);
 assert.throws(()=>analyzeLiveChaseHeadingChain(fixture.live.slice(0,-1)),/Incomplete/);
});
test('unrecovered alternate camera branches cannot silently run active chase',()=>{
 for(const [mode,crashed,path] of [[5,0,'fixed-target'],[3,0,'rider-position'],[0,1,'alternate-eye']]){
  const state={camera:{yaw:0}},before=structuredClone(state);
  assert.throws(()=>stepMcmHeadingChase(state,{mode,crashed,eyeGate:1,bike8b4:0,rider170:0},.02),new RegExp(path));
  assert.deepEqual(state,before);
 }
});
