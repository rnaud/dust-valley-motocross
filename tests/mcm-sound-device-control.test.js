import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareSoundDeviceControl} from '../scripts/mcm-reference/compare-sound-device-control.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/sound-device-control-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('play wrapper and group stop match 1024 original executions including error exits',()=>{
 const {input,output}=fixture();assert.deepEqual(compareSoundDeviceControl(input,output),{cases:1024,comparedWords:264192,commands:2609,differences:[]});
 output[0]^=1;output[8]^=1;
 assert.deepEqual(compareSoundDeviceControl(input,output).differences.map(d=>[d.case,d.offset]),[[0,0],[0,8]]);
});
