import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareTerrainEmission} from '../scripts/mcm-reference/compare-terrain-emission.mjs';
test('complete terrain emission matches original mesh bytes, nodes, allocations and accounting',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-emission-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[key,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[key+'Sha256']);
 assert.deepEqual(compareTerrainEmission(input,output),{cases:512,words:2657205,differences:0,examples:[]});
 let cursor=0,failed=0,released=0;
 while(cursor<output.length){const used=output.readUInt32LE(cursor+12),length=output.readUInt32LE(cursor+16),start=cursor+20+4*0x210+0x600+0x2d34+0x1000+used;let at=start;
  while(at<start+length*4){const kind=output.readUInt32LE(at);if(kind===1){if(!output.readUInt32LE(at+8))failed++;at+=12;}else{assert.ok(kind===2||kind===3);if(kind===2&&output.readUInt32LE(at+4))released++;at+=8;}}cursor=at;
 }
 assert.equal(failed,36);assert.equal(released,8);
 const corrupted=Buffer.from(output);corrupted[4]^=1;assert.equal(compareTerrainEmission(input,corrupted).differences,1);
 assert.throws(()=>compareTerrainEmission(input,output.subarray(0,-1)),/Incomplete/);
});
