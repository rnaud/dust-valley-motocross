import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareParticleQuads} from '../scripts/mcm-reference/compare-particle-quads.mjs';
const fixture=()=>{const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/particle-quads-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64'),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(input),f.provenance.inputSha256);assert.equal(hash(output),f.provenance.outputSha256);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');return {input,output};};
test('particle quads and submission calls match 768 original draw-tail executions',()=>{
 const {input,output}=fixture();assert.deepEqual(compareParticleQuads(input,output),{cases:768,comparedWords:302592,vertices:12252,draws:682,commands:4774,differences:[]});
 output[1576+48]^=1;output[1576+1064]^=1;
 assert.deepEqual(compareParticleQuads(input,output).differences.map(d=>[d.case,d.offset]),[[1,48],[1,1064]]);
});

// Adapt original oracle inputs to live allocation/visible-address tables. Native
// outputs remain assertions, including sorting ties and inherited color bits.
import {generateLiveParticleQuads} from '../scripts/mcm-reference/live-particle-draw.mjs';
import {CapturedBytes} from '../src/physics/mcm/captured-bytes.js';
function liveCase(input,output,row){
 const b=input.subarray(row*0x3ec,(row+1)*0x3ec),count=b.readUInt32LE(0),poolBytes=new CapturedBytes(0x2004),projection=new CapturedBytes(count*32);
 poolBytes.writeUInt32LE(count,0x30);poolBytes.writeUInt32LE(count,0x34);
 // Reverse physical allocation order: addresses cannot be treated as indices.
 const particles=Array.from({length:count},(_,i)=>CapturedBytes.from(b.subarray(0xa4+(count-1-i)*72,0xa4+(count-i)*72)));
 for(let i=0;i<count;i++){const address=0x10000+(count-1-i)*0x48;poolBytes.writeUInt32LE(address,0x44+i*4);poolBytes.writeUInt32LE(address,0xfe4+i*4);projection.set(b.subarray(0x2e4+i*32,0x2e4+(i+1)*32),i*32);}
 const uv=new CapturedBytes(0x5a0);uv.set(b.subarray(0x24,0xa4));
 const before={diffuseSeed:b.readUInt32LE(8),renderFlags:b.readUInt32LE(4),textureFormat:b.readUInt32LE(0x3e8),viewDepthHex:b.subarray(0x14,0x24).toString('hex'),fogHex:b.subarray(12,20).toString('hex'),uvHex:uv.toString('hex')};
 const after={...before,quadHex:output.subarray(row*1576+32,row*1576+32+count*128).toString('hex')};
 const external={poolBytes,particleDrawProjection:projection,pool:{count,particle(i){return particles[count-1-i].view(0,72);}}};
 return {external,before,after,count};
}
test('live particle draw adapter matches all 682 nonempty original quad executions',()=>{
 const {input,output}=fixture();let checked=0;
 for(let row=0;row<768;row++){
  const {external,before,after,count}=liveCase(input,output,row);if(!count)continue;
  assert.deepEqual(generateLiveParticleQuads(external,before,after),{visible:count,vertexWords:count*32});
  for(let i=0;i<count;i++)assert.equal(external.poolBytes.readUInt32LE(0xfe4+i*4),0x10000+(count-1-output.readUInt32LE(row*1576+i*4))*0x48);
  checked++;
 }
 assert.equal(checked,682);
});
test('live particle draw adapter rejects changed outputs and invalid ownership',()=>{
 const {input,output}=fixture();
 const run=mutate=>{const c=liveCase(input,output,1);assert.ok(c.count);mutate(c);return ()=>generateLiveParticleQuads(c.external,c.before,c.after);};
 assert.throws(run(c=>{const b=Buffer.from(c.after.quadHex,'hex');b[16]^=1;c.after.quadHex=b.toString('hex');}),/Computed particle quad vertices/);
 assert.throws(run(c=>{c.after.diffuseSeed^=1;}),/Particle quad input changed/);
 assert.throws(run(c=>{c.external.poolBytes.writeUInt32LE(0xdeadbeef,0xfe4);}),/Unknown visible particle/);
 assert.throws(run(c=>{delete c.external.particleDrawProjection;}),/Missing computed particle projection/);
});
