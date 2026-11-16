import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareWreckSound} from '../scripts/mcm-reference/compare-wreck-sound.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/wreck-sound-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('wreck selection, retry fallback and impact seek match 880 original executions',()=>{
 const {input,output}=fixture();assert.deepEqual(compareWreckSound(input,output),{cases:880,words:233200,calls:7898,differences:[]});
 output[0]^=1;output[36]^=1;
 assert.deepEqual(compareWreckSound(input,output).differences.map(d=>[d.row,d.offset]),[[0,0],[0,36]]);
});
