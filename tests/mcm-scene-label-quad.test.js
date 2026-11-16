import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareSceneLabelQuad} from '../scripts/mcm-reference/compare-scene-label-quad.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-label-quad-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
test('label quad geometry, clipping, texture crops and alpha match 4096 original cases',()=>{
 for(const [key,value]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance[key+'Sha256']);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.deepEqual(compareSceneLabelQuad(input,output),{cases:4096,words:290816,differences:0,examples:[]});
});
test('label oracle comparison rejects incomplete results and detects changed quad words',()=>{
 assert.throws(()=>compareSceneLabelQuad(input,output.subarray(4)),/Incomplete/);
 const corrupted=Buffer.from(output);corrupted[0x3c]^=1;assert.equal(compareSceneLabelQuad(input,corrupted).differences,1);
});
