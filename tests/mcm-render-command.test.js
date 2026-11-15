import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {mcmRenderUpdateCommand,mcmRenderCommandFree} from '../src/physics/mcm/render-command.js';
import {analyzeRenderCommands} from '../scripts/mcm-reference/analyze-render-command.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-command-wine11.json.br',import.meta.url))));
test('native command serialization and free/skip branches match 4096 cases',()=>{
 const input=Buffer.from(fixture.input,'base64'),expected=Buffer.from(fixture.output,'base64');
 assert.equal(input.length,4096*52);assert.equal(expected.length,4096*64);
 let frees=0,nullFrees=0;
 for(let i=0;i<4096;i++){
  const w=Array.from({length:13},(_,j)=>input.readUInt32LE(i*52+j*4));
  const command=mcmRenderUpdateCommand({resource:w[0],subresource:w[1],box:w.slice(2,8),upload:w.slice(8,11),rowPitch:w[11],slicePitch:w[12]});
  const free=mcmRenderCommandFree(command);frees+=!!free;nullFrees+=!!free&&free.pointer===0;
  const actual=[...command,Number(!!free),free?.pointer??0];
  for(let j=0;j<16;j++)assert.equal(actual[j],expected.readUInt32LE(i*64+j*4),`case ${i} word ${j}`);
 }
 assert.equal(frees,1024);assert.equal(nullFrees,512);
});

const live=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/render-command-live-wine11.json.br',import.meta.url))));
test('live command words and cleanup gates are computed from producer inputs',()=>{
 assert.deepEqual(analyzeRenderCommands(live.cases),{commands:191,words:2674,frees:191,skips:0});
 assert.match(live.provenance.cleanup,/debugger=0 clean=1/);
});
test('live command audit rejects changed producer data and omitted frees',()=>{
 const bad=structuredClone(live.cases);bad[0].producer.upload[2]^=4;
 assert.throws(()=>analyzeRenderCommands(bad),/Serialized command differs/);
 const skipped=structuredClone(live.cases);skipped[0].free=[];
 assert.throws(()=>analyzeRenderCommands(skipped),/Cleanup gate differs/);
});
