import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareRuntimeVectorRotation} from '../scripts/mcm-reference/compare-runtime-vector-rotation.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/runtime-vector-rotation-wine11.json.br',import.meta.url))));
test('runtime rotation preserves native result, axis mutation and source across 1024 cases',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareRuntimeVectorRotation(input,output),{cases:1024,words:9216,differences:0,examples:[]});
});
test('runtime rotation evidence rejects corrupt axis output and truncated records',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 output[12]^=1;assert.equal(compareRuntimeVectorRotation(input,output).differences,1);
 assert.throws(()=>compareRuntimeVectorRotation(input.subarray(1),output),/Incomplete/);
 assert.throws(()=>compareRuntimeVectorRotation(input,output.subarray(1)),/Incomplete/);
});
