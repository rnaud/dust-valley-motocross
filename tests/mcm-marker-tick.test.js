import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildMarkerTickCases,compareMarkerTick} from '../scripts/mcm-reference/compare-marker-tick.mjs';
test('marker timers and rotation dispatch match 512 original executions',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/marker-tick-wine11.json',import.meta.url)));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const [key,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[`${key}Sha256`]);
 assert.deepEqual(buildMarkerTickCases(),input);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 const result=compareMarkerTick(input,output);
 assert.equal(result.cases,512);assert.equal(result.comparedWords,26112);assert.equal(result.changedWords,542);assert.deepEqual(result.differences,[]);
 output[0]^=1;assert.deepEqual(compareMarkerTick(input,output).differences,[{case:0,offset:0,actual:0,expected:1}]);
});
