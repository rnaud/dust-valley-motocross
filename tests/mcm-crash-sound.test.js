import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareCrashSound} from '../scripts/mcm-reference/compare-crash-sound.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/crash-sound-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('crash sound controller composes original wreck and attenuation behavior across 1024 cases',()=>{
 const {input,output}=fixture();assert.deepEqual(compareCrashSound(input,output),{cases:1024,comparedWords:359424,commands:6916,differences:[]});
 output[0x108]^=1;output[0x17c]^=1;
 assert.deepEqual(compareCrashSound(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x108],[0,0x17c]]);
});
