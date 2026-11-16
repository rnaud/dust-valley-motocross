import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';import{compareSceneVisibility}from'../scripts/mcm-reference/compare-scene-visibility.mjs';
import{updateMcmSceneVisibility}from'../src/physics/mcm/scene-visibility.js';
test('visibility cadence and fade transitions match original instructions including counter overflow',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-visibility-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareSceneVisibility(input,output),{cases:6144,words:43008,differences:0,examples:[]});output[4]^=1;assert.equal(compareSceneVisibility(input,output).differences,1);assert.throws(()=>compareSceneVisibility(input,output.subarray(0,-1)),/Incomplete/);
});
test('active visibility query cannot silently assume clear terrain',()=>{
 const view=new DataView(new ArrayBuffer(0x11c));assert.throws(()=>updateMcmSceneVisibility(view),/Missing.*terrain query/);assert.throws(()=>updateMcmSceneVisibility(view,()=>undefined),/Invalid.*terrain result/);
});
