import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseAlternateEye} from '../scripts/mcm-reference/compare-chase-alternate-eye.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-alternate-eye-wine11.json.br',import.meta.url))));
test('crash-camera orbit, clipping response, target and eye match original instructions',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const [name,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareChaseAlternateEye(input,output),{cases:4096,words:69632,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseAlternateEye(input,output).differences,1);
 assert.throws(()=>compareChaseAlternateEye(input,output.subarray(0,-1)),/Incomplete/);
});
