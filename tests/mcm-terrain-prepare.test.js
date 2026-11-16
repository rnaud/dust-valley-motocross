import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';import{compareTerrainPrepare}from'../scripts/mcm-reference/compare-terrain-prepare.mjs';import{prepareMcmTerrain}from'../src/physics/mcm/terrain-prepare.js';
test('terrain preparation matches original ordering, actor-prefix writes and callback mutations',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-prepare-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareTerrainPrepare(input,output),{cases:512,words:359424,differences:0,examples:[]});output[0xc0]^=1;assert.equal(compareTerrainPrepare(input,output).differences,1);assert.throws(()=>compareTerrainPrepare(input,output.subarray(0,-1)),/Incomplete/);
});
test('terrain traversal remains mandatory after setup',()=>{
 const view=new DataView(new ArrayBuffer(0x9f4));view.setFloat32(0x40,1,true);
 assert.throws(()=>prepareMcmTerrain(0,view,0,{position:[0,0,0],fov:85,width:640},1,{put32(){}},{clock:()=>0}),/Unconnected terrain preparation service: traverse/);
});
