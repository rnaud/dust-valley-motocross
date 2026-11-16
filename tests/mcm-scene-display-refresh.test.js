import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareSceneDisplayRefresh} from '../scripts/mcm-reference/compare-scene-display-refresh.mjs';
import {refreshMcmSceneDisplay} from '../src/physics/mcm/scene-display-refresh.js';
test('display refresh matches original modes, device errors and callback pointer changes',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-display-refresh-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,value]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareSceneDisplayRefresh(input,output),{cases:162,words:10854,differences:0,examples:[]});
 output[12]^=1;assert.equal(compareSceneDisplayRefresh(input,output).differences,1);
 assert.throws(()=>compareSceneDisplayRefresh(input,output.subarray(0,-1)),/Incomplete/);
});
test('display refresh requires device results instead of assuming success',()=>{
 const memory={u32:()=>0};
 assert.throws(()=>refreshMcmSceneDisplay(0,memory,{rectangle(){},acquire(){}}),/Missing display acquire result/);
 assert.throws(()=>refreshMcmSceneDisplay(0,memory,{rectangle(){},acquire(){return{result:0};}}),/Missing display device context/);
 assert.throws(()=>refreshMcmSceneDisplay(0,memory,{rectangle(){},acquire(){return{result:1};}}),/Unconnected.*error/);
});
