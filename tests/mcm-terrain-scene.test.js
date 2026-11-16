import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';import{compareTerrainScene}from'../scripts/mcm-reference/compare-terrain-scene.mjs';import{tickMcmTerrainScene}from'../src/physics/mcm/terrain-scene-tick.js';
test('terrain scene preserves original callback order, pointer reloads and clock wraparound',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-scene-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareTerrainScene(input,output),{cases:4096,words:86016,differences:0,examples:[]});output[12]^=1;assert.equal(compareTerrainScene(input,output).differences,1);assert.throws(()=>compareTerrainScene(input,output.subarray(0,-1)),/Incomplete/);
});
test('terrain preparation cannot silently be skipped or invent a clock result',()=>{
 const memory={u32:()=>0,put32(){assert.fail('No writes before preparation');}};
 assert.throws(()=>tickMcmTerrainScene(0,memory,{clock:()=>0}),/Unconnected.*prepare/);
 assert.throws(()=>tickMcmTerrainScene(0,memory,{clock:()=>undefined}),/Invalid terrain clock/);
});
