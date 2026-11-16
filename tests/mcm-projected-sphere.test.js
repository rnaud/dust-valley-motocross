import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareProjectedSphere} from '../scripts/mcm-reference/compare-projected-sphere.mjs';

test('sphere visibility and optional full-inside output match 8192 original executions',()=>{
  const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/projected-sphere-wine11.json.br',import.meta.url))));
  const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
  for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
  assert.deepEqual(compareProjectedSphere(input,output),{cases:8192,words:16384,differences:0,examples:[]});
  output[0]^=1;assert.equal(compareProjectedSphere(input,output).differences,1);
  assert.throws(()=>compareProjectedSphere(input,output.subarray(0,-1)),/Incomplete/);
});
