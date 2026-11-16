import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareTerrainTriangles} from '../scripts/mcm-reference/compare-terrain-triangles.mjs';
for(const name of ['triangles','fallback'])test(`terrain ${name} matches original vertex storage, winding and indices`,()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/terrain-${name}-wine11.json.br`,import.meta.url))));
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex'),options={fallback:name==='fallback'};
 for(const[key,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[key+'Sha256']);
 assert.deepEqual(compareTerrainTriangles(input,output,options),{cases:1024,words:4013056,differences:0,examples:[]});
 const corrupted=Buffer.from(output);corrupted[8+0x2d34+18]^=1;assert.equal(compareTerrainTriangles(input,corrupted,options).differences,1);
 assert.throws(()=>compareTerrainTriangles(input,output.subarray(0,-1),options),/Incomplete/);
});
