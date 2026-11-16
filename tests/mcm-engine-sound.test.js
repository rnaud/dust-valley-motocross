import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareEngineSound} from '../scripts/mcm-reference/compare-engine-sound.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/engine-sound-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('riding sound state and ordered commands match 906 original policy executions',()=>{
 const {input,output}=fixture();assert.deepEqual(compareEngineSound(input,output),{cases:906,comparedWords:306228,commands:6591,differences:[]});
 output[0x20]^=1;output[0x148]^=1;
 assert.deepEqual(compareEngineSound(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x20],[0,0x148]]);
});
test('sound policy rejects crash execution without explicit crash context',()=>{
 const {input,output}=fixture();input.writeUInt32LE(1,0x128+0x844);
 assert.throws(()=>compareEngineSound(input,output),/Crash audio policy is not connected/);
});
