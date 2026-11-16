import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliDecompressSync} from 'node:zlib';
import {compareParticleVisibility} from '../scripts/mcm-reference/compare-particle-visibility.mjs';
const fixture=()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/particle-visibility-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');
 const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);
 assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};
};
test('particle visibility preserves native partial stores across 896 original culling cases',()=>{
 const {input,output}=fixture(),r=compareParticleVisibility(input,output);
 assert.deepEqual(r,{cases:896,comparedWords:17024,changedWords:2280,differences:[]});
 // Reject corruption of an untouched word and the original acceptance result.
 output[0x44]^=1;output[0x4c+0x48]^=1;
 assert.deepEqual(compareParticleVisibility(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x44],[1,0x48]]);
});
