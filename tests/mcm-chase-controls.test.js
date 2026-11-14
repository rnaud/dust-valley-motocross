import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareChaseControls} from '../scripts/mcm-reference/compare-chase-controls.mjs';
import {analyzeLiveChaseControls} from '../scripts/mcm-reference/analyze-live-chase-controls.mjs';
import {stepMcmChaseControls} from '../src/physics/mcm/chase-controls.js';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/chase-controls-wine11.json.br',import.meta.url))));
test('camera controls match 32768 retained updates with original input readers',()=>{
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
 assert.deepEqual(compareChaseControls(input,output),{cases:8192,steps:32768,words:196608,differences:0,examples:[]});
 output[0]^=1;assert.equal(compareChaseControls(input,output).differences,1);
 assert.throws(()=>compareChaseControls(input,output.subarray(0,-1)),/Incomplete/);
});
test('live camera-key pulse matches changing angles, flags and multiplier',()=>{
 assert.deepEqual(analyzeLiveChaseControls(fixture.idle),{frames:40,words:240,active:40,changes:0,keys:[0],joysticks:[0],modes:[0]});
 assert.deepEqual(analyzeLiveChaseControls(fixture.pulse),{frames:160,words:960,active:160,changes:111,keys:[0,4],joysticks:[0],modes:[0]});
 const changed=structuredClone(fixture.pulse);changed.find(r=>r.phase==='before'&&r.inputs[64]===4).inputs[64]=0;
 assert.throws(()=>analyzeLiveChaseControls(changed),/Native control output differs/);
 const output=structuredClone(fixture.pulse);output[1].inputs[26]^=1;
 assert.throws(()=>analyzeLiveChaseControls(output),/Native control output differs/);
 assert.throws(()=>analyzeLiveChaseControls(fixture.pulse.slice(0,-1)),/Incomplete/);
});
test('unrecovered fixed-target and free-camera controls fail before changing state',()=>{
 for(const input of [{mode:5},{mode:0,usePrevious:1,freeCamera:1}]){
  const state={radius:20,pitch:0,yaw:0,reset:0},before={...state};
  assert.throws(()=>stepMcmChaseControls(state,input),/Unrecovered/);assert.deepEqual(state,before);
 }
});
