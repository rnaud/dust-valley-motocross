import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {buildApplicationFrameCases,compareApplicationFrame} from '../scripts/mcm-reference/compare-application-frame.mjs';
test('complete outer frame matches original clock, pause, callback ordering and owner advancement',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/application-frame-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const[key,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[`${key}Sha256`]);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../scripts/mcm-reference/application-frame-oracle.c',import.meta.url))).digest('hex'),fixture.provenance.harnessSha256);
 assert.deepEqual(buildApplicationFrameCases(),input);
 assert.deepEqual(compareApplicationFrame(input,output),{cases:9728,comparedWords:194560,differences:[]});
 output[4]^=1;
 assert.deepEqual(compareApplicationFrame(input,output).differences,[{case:0,word:1,actual:0,expected:1}]);
});
