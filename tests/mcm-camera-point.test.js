import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
import {compareCameraPoint} from '../scripts/mcm-reference/compare-camera-point.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/camera-point-wine11.json.br',import.meta.url))));
test('crash-camera projection matches original clipping and optional screen output',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const [name,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 const result=compareCameraPoint(input,output);
 assert.equal(result.cases,4096);assert.equal(result.words,20480);assert.equal(result.visible,166);
 assert.deepEqual(result.clipFlags,[0,1,2,4,5,6,8,9,10,16,17,18,20,21,22,24,25,26,32,33,34,36,37,38,40,41,42]);
 assert.equal(result.differences,0);assert.deepEqual(result.examples,[]);
 output[12]^=1;assert.equal(compareCameraPoint(input,output).differences,1);
 assert.throws(()=>compareCameraPoint(input,output.subarray(0,-1)),/Incomplete/);
});
