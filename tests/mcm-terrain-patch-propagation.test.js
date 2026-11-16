import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareTerrainPatchPropagation} from '../scripts/mcm-reference/compare-terrain-patch-propagation.mjs';
import {compareTerrainNodeUpdate} from '../scripts/mcm-reference/compare-terrain-node-update.mjs';
function load(name){
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
 const result={};
 for(const key of ['input','output','metadata'])if(fixture[key+'Hex']){
  result[key]=Buffer.from(fixture[key+'Hex'],'hex');
  assert.equal(createHash('sha256').update(result[key]).digest('hex'),fixture.provenance[key+'Sha256']);
 }
 return result;
}
test('cross-patch neighbors and descendant boundaries match original execution',()=>{
 const {input,output}=load('terrain-patch-propagation');
 assert.deepEqual(compareTerrainPatchPropagation(input,output),{cases:4096,words:39562,differences:0,examples:[]});
 const corrupted=Buffer.from(output);corrupted[4]^=1;
 assert.ok(compareTerrainPatchPropagation(input,corrupted).differences>0);
 assert.throws(()=>compareTerrainPatchPropagation(input,output.subarray(0,-1)),/Incomplete/);
});
test('complete node update propagation chain matches original execution',()=>{
 const {input,output,metadata}=load('terrain-node-full-update');
 assert.deepEqual(compareTerrainNodeUpdate(input,output,{metadata,realPatch:true}),{cases:1024,words:799744,differences:0,examples:[]});
 const corrupted=Buffer.from(output);corrupted[4]^=1;
 assert.equal(compareTerrainNodeUpdate(input,corrupted,{metadata,realPatch:true}).differences,1);
});
