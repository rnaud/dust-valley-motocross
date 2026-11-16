import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareDustTick} from '../scripts/mcm-reference/compare-dust-tick.mjs';
import {tickMcmDust} from '../src/physics/mcm/dust-tick.js';
const fixture=()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/dust-tick-wine11.json.br',import.meta.url))));
 const input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);
 assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 return {input,output};
};
test('dust tick and complete particle allocations match 968 original cases',()=>{
 const {input,output}=fixture(),r=compareDustTick(input,output);
 assert.equal(r.cases,968);assert.equal(r.comparedWords,17456912);assert.equal(r.changedWords,255602);assert.deepEqual(r.differences,[]);
 output[0x88+0x44]^=1;
 assert.deepEqual(compareDustTick(input,output).differences.map(d=>[d.case,d.offset]),[[0,0xcc]]);
});
test('active dust rejects a missing pool instead of dropping particle writes',()=>{
 const {input}=fixture(),bytes=Buffer.from(input.subarray(0x90,0x90+0x84));
 assert.throws(()=>tickMcmDust(new DataView(bytes.buffer,bytes.byteOffset,bytes.length),{dt:.08,paused:0}),/captured shared particle pool/);
});
