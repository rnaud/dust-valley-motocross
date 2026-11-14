import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareFrameEffects} from '../scripts/mcm-reference/compare-frame-effects.mjs';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/frame-effects-wine11.json.br',import.meta.url))));
test('frame effects match original disabled, contact, throttle-transition and shutdown branches',()=>{
 const f=fixture(),r=compareFrameEffects(Buffer.from(f.inputHex,'hex'),Buffer.from(f.outputHex,'hex'));
 assert.equal(r.cases,256);assert.equal(r.comparedWords,304128);assert.equal(r.changedWords,3874);assert.deepEqual(r.differences,[]);
});
test('frame effects comparator detects a changed original emitter word',()=>{
 const f=fixture(),output=Buffer.from(f.outputHex,'hex');output[0x1990+0x64]^=1;
 assert.equal(compareFrameEffects(Buffer.from(f.inputHex,'hex'),output).differences.length,1);
});
