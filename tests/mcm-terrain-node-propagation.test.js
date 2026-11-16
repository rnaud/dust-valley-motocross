import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareTerrainNodeUpdate} from '../scripts/mcm-reference/compare-terrain-node-update.mjs';
import {notifyMcmTerrainVertex} from '../src/physics/mcm/terrain-vertex-propagation.js';
test('node updates, rebuild sweeps and recursive dependencies match original execution',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/terrain-node-propagation-wine11.json.br',import.meta.url))));
 const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex'),metadata=Buffer.from(fixture.metadataHex,'hex');
 for(const[name,bytes]of[['input',input],['output',output],['metadata',metadata]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
 assert.deepEqual(compareTerrainNodeUpdate(input,output,{metadata}),{cases:1024,words:2031832,differences:0,examples:[]});
 output[4]^=1;assert.equal(compareTerrainNodeUpdate(input,output,{metadata}).differences,1);
 assert.throws(()=>compareTerrainNodeUpdate(input,output.subarray(0,-1),{metadata}),/Incomplete/);
});
test('cross-patch notifications cannot silently become no-ops',()=>{
 const node=new DataView(new ArrayBuffer(0x210)),owner=new DataView(new ArrayBuffer(0x600));node.setUint32(0x58,2,true);
 assert.throws(()=>notifyMcmTerrainVertex(1,0,0,128,1,0,{node:()=>node,owner:()=>owner,vertexRows:Array.from({length:17},(_,i)=>i*17),vertexMetadata:()=>Array(8).fill(0)}),/Unconnected terrain update service: boundary/);
});
