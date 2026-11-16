import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Diagnostic only: these words belong to Wine's adjacent heap header, not
// rider-owned state. Do not feed this report's observed values into simulation.
export function analyzeRiderHeapBoundaries(path){
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(path)));
 for(const name of ['world-riders.jsonl','world-child-0.json','world-child-1.json']){
  assert.equal(createHash('sha256').update(fixture.files[name]).digest('hex'),fixture.provenance.fileSha256[name],`Corrupt ${name}`);
 }
 const rows=fixture.files['world-riders.jsonl'].trim().split('\n').map(JSON.parse);
 return [0,1].map(index=>{
  const child=JSON.parse(fixture.files[`world-child-${index}.json`]);
  const samples=rows.filter(row=>row.address===child.address),transitions=[];
  let previous;
  for(const row of samples){
   const words=row.boundaryWords;
   assert.ok(Array.isArray(words)&&words.length===2&&words.every(word=>Number.isInteger(word)&&word>=0&&word<=0xffffffff));
   const key=words.join(',');if(key===previous)continue;previous=key;
   const [low,high]=words;
   transitions.push({sequence:row.sequence,phase:row.phase,words,blockBytes:(low&0xffff)*8,tailBytes:low>>>16,regionOffset:high&0xffff,type:(high>>>16)&255,flags:high>>>24});
  }
  return {bike:child.bikeAddress,child:child.address,adjacentHeader:child.address+0x610,adjacentPayload:child.address+0x618,samples:samples.length,transitions};
 });
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){
 console.log(JSON.stringify({scope:'Observed heap-header transitions; not an autonomous allocator implementation',captures:process.argv.slice(2).map(path=>({path,riders:analyzeRiderHeapBoundaries(path)}))},null,2));
}
