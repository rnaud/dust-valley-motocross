import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareTerrainVertexBuilder} from '../scripts/mcm-reference/compare-terrain-vertex-builder.mjs';
test('terrain vertex cache, positions, formats and texture orientations match original execution',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-vertex-builder-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareTerrainVertexBuilder(input,output),{cases:2048,words:5928960,differences:0,examples:[]});
 const corrupted=Buffer.from(output);corrupted[24]^=1;assert.equal(compareTerrainVertexBuilder(input,corrupted).differences,1);
 assert.throws(()=>compareTerrainVertexBuilder(input,output.subarray(0,-1)),/Incomplete/);
});
