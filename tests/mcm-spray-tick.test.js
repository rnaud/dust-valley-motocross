import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareSprayTick} from '../scripts/mcm-reference/compare-spray-tick.mjs';
import {tickMcmSpray} from '../src/physics/mcm/spray-tick.js';
const fixture=()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/spray-tick-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);
 assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};
};
test('spray tick and complete particle allocations match 616 original cases',()=>{
 const {input,output}=fixture(),r=compareSprayTick(input,output);
 assert.equal(r.cases,616);assert.equal(r.comparedWords,11328240);assert.equal(r.changedWords,63474);assert.deepEqual(r.differences,[]);
 output[0x618+0x44]^=1;
 assert.deepEqual(compareSprayTick(input,output).differences.map(d=>[d.case,d.offset]),[[0,0x65c]]);
});
test('spray requires its shared pool and the native index-32 trailing words',()=>{
 const {input}=fixture(),bytes=Buffer.from(input.subarray(0x62c,0x62c+0x614)),view=n=>new DataView(bytes.buffer,bytes.byteOffset,n);
 assert.throws(()=>tickMcmSpray(view(0x614),{dt:.02,paused:0}),/captured shared particle pool/);
 bytes.writeUInt32LE(32,0x608);bytes.writeUInt32LE(0,0x30);bytes.writeUInt32LE(1,0x64);
 const particle=new DataView(new ArrayBuffer(0x48)),pool={count:0,acceleration:[0,-9.8,0],particle:()=>particle};
 assert.throws(()=>tickMcmSpray(view(0x60c),{dt:.02,paused:0,pool}),/Spray table boundary bytes/);
});
