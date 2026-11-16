import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadTerrainResources} from '../scripts/mcm-reference/terrain-resources.mjs';
import {createTerrainNodeObservationDecoder} from '../scripts/mcm-reference/terrain-node-observations.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-terrain-resources-wine11.json.br',import.meta.url))));
const initial=()=>JSON.parse(fixture.files['world-actor-tree.json']).nodes.find(n=>n.update===0x411000).terrainInitial;
test('original terrain banks and tables are complete and verified unchanged at every snapshot',()=>{
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const i=initial(),resources=loadTerrainResources(i),decoder=createTerrainNodeObservationDecoder(i.nodeSnapshot);let count=0;
 assert.equal(resources.banks.size,882);assert.equal(decoder.nodes.size,12594);assert.equal(resources.sphereEnabled,0);
 for(const row of fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse)){
  const state=row.sceneTerrainObservation;if(!state.nodeSnapshot)continue;resources.assertObservation(state);decoder.apply(state.nodeSnapshot);count++;
 }
 assert.equal(count,64);assert.equal(decoder.sequence,64);
 for(const bytes of decoder.nodes.values())assert.ok(resources.banks.has(bytes.readUInt32LE(0x50)));
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,52);
 assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
});
test('terrain inputs reject misaligned metadata, changed detail lookup and missing bank data',()=>{
 const i=initial(),metadata=Buffer.from(i.resources.vertexMetadataHex,'hex');metadata.writeInt32LE(7,0);i.resources.vertexMetadataHex=metadata.toString('hex');assert.throws(()=>loadTerrainResources(i),/Misaligned/);
 const j=initial(),lookup=Buffer.from(j.resources.detailLookupHex,'hex');lookup[0]^=1;j.resources.detailLookupHex=lookup.toString('hex');assert.throws(()=>loadTerrainResources(j),/detail table differs/);
 const k=initial();k.resources.banks.pop();assert.throws(()=>loadTerrainResources(k),/Missing terrain node bank/);
 const resources=loadTerrainResources(initial());assert.throws(()=>resources.assertObservation({}),/stability/);assert.throws(()=>resources.assertObservation({resources:{},resourcesUnchanged:true}),/cannot replace/);
});
