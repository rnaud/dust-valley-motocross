import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareImpactParticleTick} from '../scripts/mcm-reference/compare-impact-particle-tick.mjs';
import {tickMcmImpactParticles} from '../src/physics/mcm/impact-particle-tick.js';
test('impact emitter matches 256 original calls including table boundaries and pool exhaustion',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/impact-particle-tick-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 for(const [name,bytes]of [['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[`${name}Sha256`]);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 const result=compareImpactParticleTick(input,output);
 assert.equal(result.cases,256);assert.equal(result.comparedWords,4708096);assert.equal(result.changedWords,82579);assert.deepEqual(result.differences,[]);
 // Index 32 crosses the owned allocation. Missing external words must fail,
 // rather than inventing zero velocity or wrapping the table early.
 const bytes=Buffer.from(input.subarray(0x630,0x630+0x618));
 bytes.writeUInt32LE(0,0x30);bytes.writeUInt32LE(1,0x64);bytes.writeUInt32LE(32,0x60c);bytes.writeFloatLE(10,0x44);
 const particle=new DataView(new ArrayBuffer(72)),pool={count:0,acceleration:[0,-9.8,0],particle:()=>particle};
 assert.throws(()=>tickMcmImpactParticles(new DataView(bytes.buffer,bytes.byteOffset,0x610),{dt:.1,paused:0,pool}),/boundary bytes/);
});
