import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseFactor} from '../scripts/mcm-reference/compare-chase-factor.mjs';
import {compareChaseFactorChain} from '../scripts/mcm-reference/compare-chase-factor-chain.mjs';
import {analyzeLiveChaseFactor} from '../scripts/mcm-reference/analyze-live-chase-factor.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-factor-wine11.json.br',import.meta.url))));
test('direct camera factor boundary matches thresholds and native invalid-result bits',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseFactor(input,output),{cases:1280,words:3840,invalidWords:281,differences:0,examples:[]});
 output[4]^=1;assert.equal(compareChaseFactor(input,output).differences,1);
 assert.throws(()=>compareChaseFactor(input,output.subarray(0,-1)),/Incomplete/);
});
test('computed factor drives 13824 retained native chain updates',()=>{
 assert.deepEqual(compareChaseFactorChain(Buffer.from(fixture.chainInputHex,'hex'),Buffer.from(fixture.chainOutputHex,'hex')),{cases:3456,steps:13824,words:622080,active:4032,bypassed:9792,resets:384,differences:0,examples:[]});
});
test('computed live factor feeds retained camera chain without recorded-factor injection',()=>{
 const expected={pairs:80,words:3760,active:80,bypassed:0,resets:0,modes:[0]};
 assert.deepEqual(analyzeLiveChaseFactor(fixture.live),expected);
 const ignored=structuredClone(fixture.live);for(const r of ignored)r.inputs[9]=0x7fc00000;
 assert.deepEqual(analyzeLiveChaseFactor(ignored),expected);
 const changed=structuredClone(fixture.live);changed[0].inputs[41]=0;
 assert.throws(()=>analyzeLiveChaseFactor(changed),/Native targets differ|Native filters differ|Native result differs/);
 assert.throws(()=>analyzeLiveChaseFactor(fixture.live.slice(0,-1)),/Incomplete/);
});
