import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';import{compareTerrainDetail}from'../scripts/mcm-reference/compare-terrain-detail.mjs';import{compareTerrainView}from'../scripts/mcm-reference/compare-terrain-view.mjs';
for(const[kind,compare,cases,words]of[['detail',compareTerrainDetail,4240,16960],['view',compareTerrainView,4096,122880]])test('terrain '+kind+' matches original arithmetic and preserves unrelated words',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-'+kind+'-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compare(input,output),{cases,words,differences:0,examples:[]});output[0]^=1;assert.equal(compare(input,output).differences,1);assert.throws(()=>compare(input,output.subarray(0,-1)),/Incomplete/);
});
