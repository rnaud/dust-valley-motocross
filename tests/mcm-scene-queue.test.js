import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';
import{compareSceneQueue}from'../scripts/mcm-reference/compare-scene-queue.mjs';
import{tickMcmSceneQueue}from'../src/physics/mcm/scene-queue-tick.js';
test('scene queue ordering, expiry and replacement-head timing match the original',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-queue-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 for(const[name,value]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareSceneQueue(input,output),{cases:4096,words:24576,removals:1728,differences:0,examples:[]});
 output[4]^=1;assert.equal(compareSceneQueue(input,output).differences,1);
 assert.throws(()=>compareSceneQueue(input,output.subarray(0,-1)),/Incomplete/);
});
test('missing queue services fail before silently skipping traversal or deletion',()=>{
 assert.throws(()=>tickMcmSceneQueue(0,1,{},{}),/children/);
 let writes=0;const memory={u32:()=>256,f32:p=>p===256+0x80?0:1,put32:()=>writes++,putFloat:()=>writes++};
 assert.throws(()=>tickMcmSceneQueue(0,1,memory,{children(){}}),/free/);assert.equal(writes,0);
});
