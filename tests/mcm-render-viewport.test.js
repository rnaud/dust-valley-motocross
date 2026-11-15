import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mcmRenderViewportMatrix} from '../src/physics/mcm/render-viewport.js';
import {bitsFloat} from '../src/physics/mcm/math.js';
import {mcmRenderProductAddress} from '../src/physics/mcm/render-dirty.js';

const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-viewport-wine11.json.br',import.meta.url))));
for(const group of fixture.groups) test(`viewport upload matrix matches pinned native ${group.name} cases`,()=>{
 const input=Buffer.from(group.input,'base64'),expected=Buffer.from(group.output,'base64');
 assert.equal(createHash('sha256').update(input).digest('hex'),group.inputSha256);
 assert.equal(createHash('sha256').update(expected).digest('hex'),group.outputSha256);
 assert.equal(input.length,group.cases*24);assert.equal(expected.length,group.cases*64);
 for(let i=0;i<group.cases;i++){
  const at=i*24;
  const matrix=mcmRenderViewportMatrix({x:input.readFloatLE(at),y:input.readFloatLE(at+4),width:input.readFloatLE(at+8),height:input.readFloatLE(at+12),state2300:input.readUInt32LE(at+16),device28:input.readUInt32LE(at+20)});
  const words=new Uint32Array(matrix.buffer);
  for(let j=0;j<16;j++)assert.equal(words[j],expected.readUInt32LE(i*64+j*4),`case ${i}, word ${j}`);
 }
});

test('live transformed uploads contain the computed viewport matrix',()=>{
 const live=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-viewport-live-wine11.json.br',import.meta.url))));
 assert.equal(live.cases.length,12);
 assert.match(live.provenance.cleanup,/debugger=0 clean=1/);
 for(const {entry,declaration,input,upload,payload} of live.cases){
  assert.ok(declaration.transformed);
  assert.equal(input.block,declaration.block);
  assert.equal(input.frame,entry.frame);assert.equal(payload.frame,entry.frame);
  assert.equal(upload.cs,input.cs);assert.equal(upload.count,64);
  assert.equal(upload.data,payload.data);
  assert.equal(payload.data,mcmRenderProductAddress(entry.esp));
  const [x,y,width,height]=declaration.viewport.map(bitsFloat);
  const result=mcmRenderViewportMatrix({x,y,width,height,...input});
  assert.deepEqual([...new Uint32Array(result.buffer)],payload.words);
 }
});
