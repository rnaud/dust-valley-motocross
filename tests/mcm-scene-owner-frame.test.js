import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {buildSceneOwnerFrameCases,compareSceneOwnerFrame} from '../scripts/mcm-reference/compare-scene-owner-frame.mjs';
test('frame-owner ring and counter match 512 original executions including wraparound',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/scene-owner-frame-wine11.json',import.meta.url))),input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const[key,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[`${key}Sha256`]);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.deepEqual(buildSceneOwnerFrameCases(),input);
 assert.deepEqual(compareSceneOwnerFrame(input,output),{cases:512,comparedWords:2048,differences:[]});
 output[4]^=1;assert.deepEqual(compareSceneOwnerFrame(input,output).differences,[{case:0,word:1,actual:1,expected:0}]);
});
