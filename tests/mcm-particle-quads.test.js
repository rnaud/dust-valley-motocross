import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareParticleQuads} from '../scripts/mcm-reference/compare-particle-quads.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/particle-quads-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('particle quads and submission calls match 768 original draw-tail executions',()=>{
 const {input,output}=fixture();assert.deepEqual(compareParticleQuads(input,output),{cases:768,comparedWords:302592,vertices:12252,draws:682,commands:4774,differences:[]});
 output[1576+48]^=1;output[1576+1064]^=1;
 assert.deepEqual(compareParticleQuads(input,output).differences.map(d=>[d.case,d.offset]),[[1,48],[1,1064]]);
});
