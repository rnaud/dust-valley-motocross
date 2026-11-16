import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareTerrainVertexDistance} from '../scripts/mcm-reference/compare-terrain-vertex-distance.mjs';
import {compareTerrainNodeUpdate} from '../scripts/mcm-reference/compare-terrain-node-update.mjs';
import {createMcmTerrainDetailTables} from '../src/physics/mcm/terrain-detail-tables.js';
import {resetMcmTerrainDetail,updateMcmTerrainVertex} from '../src/physics/mcm/terrain-node-update.js';
const fixture=kind=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${kind}-wine11.json.br`,import.meta.url))));
for(const[kind,compare,cases,words]of[['terrain-vertex-distance',compareTerrainVertexDistance,8192,16384],['terrain-node-update',compareTerrainNodeUpdate,1024,846248]]){
 test(kind+' matches original state and callback ordering',()=>{
  const f=fixture(kind),input=Buffer.from(f.inputHex,'hex'),output=Buffer.from(f.outputHex,'hex');
  for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),f.provenance[name+'Sha256']);
  assert.deepEqual(compare(input,output),{cases,words,differences:0,examples:[]});
  output[kind==='terrain-node-update'?4:0]^=1;assert.equal(compare(input,output).differences,1);
  assert.throws(()=>compare(input,output.subarray(0,-1)),/Incomplete/);
 });
}
test('all terrain detail lookup entries match original table initialization',()=>{
 const f=fixture('terrain-detail-tables'),expected=Buffer.from(f.outputHex,'hex'),tables=createMcmTerrainDetailTables(),actual=Buffer.alloc(66048);
 assert.equal(createHash('sha256').update(expected).digest('hex'),f.provenance.outputSha256);
 Buffer.from(tables.lookup).copy(actual);for(let i=0;i<256;i++)actual.writeUInt16LE(tables.inverse[i],65536+i*2);
 assert.deepEqual(actual,expected);
});
test('terrain updates require rebuilding and active-bit propagation services',()=>{
 const node=new DataView(new ArrayBuffer(0x210)),owner=new DataView(new ArrayBuffer(0x600)),bank=new DataView(new ArrayBuffer(0x1210));
 assert.throws(()=>resetMcmTerrainDetail(1,{node:()=>node}),/Unconnected terrain update service: rebuild/);
 node.setUint8(0x60,0x80);
 assert.throws(()=>updateMcmTerrainVertex(1,0,0,{node:()=>node,owner:()=>owner,bank:()=>bank,vertexRows:Array.from({length:17},(_,i)=>i*17),inverse:new Uint16Array(256)}),/Unconnected terrain update service: propagate/);
});
