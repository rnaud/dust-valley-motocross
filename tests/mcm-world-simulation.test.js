import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {runWorldTrajectory} from '../scripts/mcm-reference/run-world-trajectory.mjs';
for(const fullHeap of [false,true])test(`continuous world matches both native bikes${fullHeap?' with computed terrain and heap':''} without later simulation outputs`,async()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${fullHeap?'world-full-allocator':'world-application-frame'}-wine11.json.br`,import.meta.url))));
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 const files=Object.fromEntries(Object.entries(fixture.files).filter(([name])=>name.startsWith('world-')&&name!=='world-animation-observations.json'&&(name.endsWith('.json')||/^world-mesh-[0-9]+\.jsonl$/.test(name))));
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url))));
 const deltas=rows.filter((_,i)=>i%4===0).map(row=>Buffer.from(row.stackHex,'hex').readFloatLE(0xbfc));
 const controls=fullHeap?rows.filter((_,i)=>i%4===0).map(row=>({steer:new Float32Array(Uint32Array.of(row.frameInput.steerBits).buffer)[0],lean:new Float32Array(Uint32Array.of(row.frameInput.longitudinalBits).buffer)[0]})):undefined;
 const result=await runWorldTrajectory({files,t,deltas,fullHeap,controls,throttleFrames:fullHeap?48:12},new URL('../',import.meta.url).href);
 assert.equal(result.frames,64);assert.equal(result.outputs.length,256);let words=0;
 result.outputs.forEach((actual,i)=>{
  const expected=rows[i],bytes=Buffer.from(expected.bodyHex,'hex');assert.equal(actual.address,expected.bike);assert.equal(actual.phase,expected.phase);assert.equal(actual.random,expected.randomState);
  actual.body.forEach((value,j)=>{assert.equal(value,bytes.readUInt32LE(j*4),`frame ${actual.frame} ${actual.phase} +${(j*4).toString(16)}`);words++;});
 });
 assert.equal(words,209408);
 if(fullHeap){assert.equal(result.terrainTicks,63);assert.equal(result.heap.allocations,5229);assert.equal(result.heap.frees,4801);}
});
