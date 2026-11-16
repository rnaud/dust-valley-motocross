import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildMarkerDrawCases,compareMarkerDraw} from '../scripts/mcm-reference/compare-marker-draw.mjs';
test('marker gates and shape projection match 2048 original executions',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/marker-draw-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const [key,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[`${key}Sha256`]);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.deepEqual(buildMarkerDrawCases(),input);
 const result=compareMarkerDraw(input,output);assert.equal(result.comparedWords,18432);assert.deepEqual(result.differences,[]);
 assert.deepEqual(result.outcomes,{'0:0:0':2016,'0:0:1':16,'1:1:0':8,'1:0:0':8});
 output[0]^=1;assert.deepEqual(compareMarkerDraw(input,output).differences,[{case:0,word:0,actual:1,expected:0}]);
});
