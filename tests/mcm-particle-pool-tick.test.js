import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareParticlePoolTick} from '../scripts/mcm-reference/compare-particle-pool-tick.mjs';
test('shared particle pool count, slot swaps and complete allocations match 96 native cases',()=>{
 const data=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/particle-pool-tick-wine11.json.br',import.meta.url))));
 const input=Buffer.from(data.input,'base64'),output=Buffer.from(data.output,'base64'),r=compareParticlePoolTick(input,output);
 assert.equal(r.cases,96);assert.equal(r.comparedWords,1824096);assert.equal(r.changedWords,28951);assert.deepEqual(r.differences,[]);
 // Inactive tail bytes and pointer permutations are part of the check too.
 output[4004+0x44]^=1;output[4]^=1;
 assert.deepEqual(compareParticlePoolTick(input,output).differences.map(d=>[d.case,d.offset]),[[0,4],[0,4072]]);
});
