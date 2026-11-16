import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';
import{compareSceneDisplay}from'../scripts/mcm-reference/compare-scene-display.mjs';
import{tickMcmSceneDisplay}from'../src/physics/mcm/scene-display-tick.js';
test('scene display preserves native timing, callback mutation and visibility order',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-display-wine11.json.br',import.meta.url)))),input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');for(const[name,value]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareSceneDisplay(input,output),{cases:4096,words:155648,refreshes:930,maps:2048,visibilityCalls:1843,differences:0,examples:[]});output[4]^=1;assert.equal(compareSceneDisplay(input,output).differences,1);assert.throws(()=>compareSceneDisplay(input,output.subarray(0,-1)),/Incomplete/);
});
test('active display refresh cannot be silently skipped',()=>{
 const words=new Map([[0x100,0x3f800000],[0x4e2ef4,0],[0x4e4fb4,4096],[4096+0x6f4,1]]),memory={u32:p=>{assert.ok(words.has(p));return words.get(p);},f32:p=>new Float32Array(Uint32Array.of(words.get(p)).buffer)[0],put32:(p,v)=>words.set(p,v),putFloat:(p,v)=>words.set(p,new Uint32Array(Float32Array.of(v).buffer)[0])};
 assert.throws(()=>tickMcmSceneDisplay(0,.1,memory,{children(){}}),/Unconnected scene display service: refresh/);
});
