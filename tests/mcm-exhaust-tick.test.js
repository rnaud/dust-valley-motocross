import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareExhaustTick} from '../scripts/mcm-reference/compare-exhaust-tick.mjs';
import {tickMcmExhaust} from '../src/physics/mcm/exhaust-tick.js';
const fixture=()=>{
 const data=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/exhaust-tick-wine11.json.br',import.meta.url))));
 return {input:Buffer.from(data.input,'base64'),output:Buffer.from(data.output,'base64')};
};
test('exhaust tick and particle writes match 160 original executable cases',()=>{
 const {input,output}=fixture(),report=compareExhaustTick(input,output);
 assert.equal(report.cases,160);assert.equal(report.comparedWords,2286240);assert.equal(report.changedWords,5260);assert.deepEqual(report.differences,[]);
 // Check an untouched particle word too: the comparison covers whole records.
 output[0x484+0x24]^=1;
 assert.deepEqual(compareExhaustTick(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x4a8]]);
});
test('active exhaust refuses to omit an uncaptured particle pool',()=>{
 const {input}=fixture(),bytes=Buffer.from(input.subarray(0x48c,2*0x48c)),view=new DataView(bytes.buffer,bytes.byteOffset,0x480);
 view.setFloat32(0x48,.25,true);
 assert.throws(()=>tickMcmExhaust(view,{dt:.02,paused:0}),/pool is not captured/);
});
