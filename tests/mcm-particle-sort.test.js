import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareParticleSort} from '../scripts/mcm-reference/compare-particle-sort.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/particle-sort-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('particle draw sort matches original CRT ordering across 228 finite and exceptional cases',()=>{
 const {input,output}=fixture();assert.deepEqual(compareParticleSort(input,output),{cases:228,comparedWords:233472,activeParticles:41028,differences:[]});
 output.writeUInt32LE(999,0);output.writeUInt32LE(999,24*4096);assert.deepEqual(compareParticleSort(input,output).differences,[{case:0,index:0,actual:0,expected:999},{case:24,index:0,actual:1,expected:999}]);
});
