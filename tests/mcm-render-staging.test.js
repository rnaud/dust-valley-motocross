import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {mcmRenderTemporaryStage,mcmRenderTemporaryUnmap} from '../src/physics/mcm/render-staging.js';
import {analyzeRenderStaging} from '../scripts/mcm-reference/analyze-render-staging.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}.json.br`,import.meta.url))));
test('intact native map and unmap match format branches and allocation failures',()=>{
 const fixture=read('render-staging-wine11'),input=Buffer.from(fixture.input,'base64'),output=Buffer.from(fixture.output,'base64');
 assert.equal(input.length,4096*196);assert.equal(output.length,4096*132);let failures=0;
 for(let i=0;i<4096;i++){
  const words=Array.from({length:49},(_,j)=>input.readUInt32LE(i*196+j*4));
  const stage=mcmRenderTemporaryStage({format:words.slice(0,33),box:words.slice(33,39),mapFlags:0x40000000,allocationPointer:words[39],previousState:words.slice(40)});
  const unmap=stage.success?mcmRenderTemporaryUnmap(stage.state):null;failures+=!stage.success;
  const actual=[...stage.mapped,...stage.state,Number(stage.success),stage.size,Number(!!unmap),
   ...(unmap?unmap.upload:Array(3).fill(0xa5a5a5a5)),...(unmap?unmap.box:Array(6).fill(0xa5a5a5a5)),...(unmap?unmap.state:stage.state)];
  for(let j=0;j<33;j++)assert.equal(actual[j],output.readUInt32LE(i*132+j*4),`case ${i} word ${j}`);
 }
 assert.equal(failures,2048);
});
const live=read('render-staging-live-wine11');
test('live resource inputs compute staging, producer commands and free decisions',()=>{
 assert.deepEqual(analyzeRenderStaging(live.cases,live.heapHandle),{uploads:222,allocatedBytes:22492,commands:222,frees:222,heapStores:222});
 assert.match(live.provenance.cleanup,/debugger=0 clean=1/);
});
test('staging audit rejects changed format and missing free',()=>{
 const bad=structuredClone(live.cases);bad[0].input.format[0x2c/4]++;
 assert.throws(()=>analyzeRenderStaging(bad,live.heapHandle));
 const omitted=structuredClone(live.cases);omitted[0].frees=[];
 assert.throws(()=>analyzeRenderStaging(omitted,live.heapHandle));
});

test('staging audit rejects an incorrect final heap write',()=>{
 const bad=structuredClone(live.cases);bad[0].stores[0].value^=1;
 assert.throws(()=>analyzeRenderStaging(bad,live.heapHandle));
});
