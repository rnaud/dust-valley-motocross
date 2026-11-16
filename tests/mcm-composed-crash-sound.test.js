import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareComposedCrashSound} from '../scripts/mcm-reference/compare-composed-crash-sound.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/composed-crash-sound-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('crash controller composes native playback gates and group behavior across 4096 cases',()=>{
 const {input,output}=fixture();assert.deepEqual(compareComposedCrashSound(input,output),{cases:4096,comparedWords:1437696,commands:34646,differences:[]});
 output[0x108]^=1;output[0x17c]^=1;
 assert.deepEqual(compareComposedCrashSound(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x108],[0,0x17c]]);
});
