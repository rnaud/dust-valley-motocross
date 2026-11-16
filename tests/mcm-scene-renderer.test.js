import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{brotliDecompressSync}from'node:zlib';import{createHash}from'node:crypto';
import{compareSceneRenderer,compareCameraClip}from'../scripts/mcm-reference/compare-scene-renderer.mjs';
import{setMcmCameraClip}from'../src/physics/mcm/camera-clip.js';
import{tickMcmSceneRenderer}from'../src/physics/mcm/scene-renderer-tick.js';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/scene-renderer-wine11.json.br',import.meta.url))));
for(const[kind,compare,cases,words]of[['tick',compareSceneRenderer,512,17920],['clip',compareCameraClip,256,512]])test(`${kind} scene-camera boundary matches original instructions`,()=>{
 const f=fixture.cases[kind],input=Buffer.from(f.inputHex,'hex'),output=Buffer.from(f.outputHex,'hex');for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),f[name+'Sha256']);
 assert.deepEqual(compare(input,output),{cases,words,differences:0,examples:[]});output[0]^=1;assert.equal(compare(input,output).differences,1);assert.throws(()=>compare(input,output.subarray(0,-1)),/Incomplete/);
});
test('retained camera clipping preserves first-error exit and requires device results',()=>{
 const c={retainedMode:1},calls=[];setMcmCameraClip(c,0,200000,{near(v){calls.push(['near',v]);return 9;},far(){assert.fail('Far setter must not run after near error');},error(...args){calls.push(['error',...args]);}});
 assert.deepEqual(calls,[['near',1],['error',9,0x4e7a08,0x1ac]]);assert.equal(c.far,100000);
 assert.throws(()=>setMcmCameraClip(c,1,2,{near(){}}),/Missing camera clip result/);
 assert.throws(()=>tickMcmSceneRenderer(0,{u32:()=>1,f32:()=>100},{clip(){},matrices(){},submit(){}}),/Missing scene renderer result/);
});
