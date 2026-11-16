import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';import{compareSceneFade}from'../scripts/mcm-reference/compare-scene-fade.mjs';
test('display fade matches native clamp ordering, signed bits, exceptional arithmetic and integer rounding',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-fade-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareSceneFade(input,output),{cases:6084,words:36504,differences:0,examples:[]});output[20]^=1;assert.equal(compareSceneFade(input,output).differences,1);assert.throws(()=>compareSceneFade(input,output.subarray(0,-1)),/Incomplete/);
});
