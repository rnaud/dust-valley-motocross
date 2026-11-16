import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {buildSceneTickCases,compareSceneTick} from '../scripts/mcm-reference/compare-scene-tick.mjs';
import {tickMcmScene} from '../src/physics/mcm/scene-tick.js';
test('scene camera dispatch, environment placement and clock match 4096 original executions',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-tick-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const [key,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[`${key}Sha256`]);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.deepEqual(input,buildSceneTickCases());
 assert.deepEqual(compareSceneTick(input,output),{cases:4096,comparedWords:286720,switched:640,positioned:1024,rolled:640,differences:[]});
 output[0]^=1;
 assert.deepEqual(compareSceneTick(input,output).differences,[{case:0,offset:0,actual:1,expected:0}]);
});
test('scene update requires connected dependency services',()=>{
 assert.throws(()=>tickMcmScene(0,.016,{u32:()=>0},{}),/Unconnected scene service: queryInput/);
 assert.throws(()=>tickMcmScene(0,.016,{u32:()=>1},{}),/Unconnected scene service: children/);
});
