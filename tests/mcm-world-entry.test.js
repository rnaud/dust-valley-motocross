import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {loadLiveWorldEntry} from '../scripts/mcm-reference/live-world-entry.mjs';
import {tickMcmWorldActors} from '../src/physics/mcm/world-actors-tick.js';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-world-entry-wine11.json.br',import.meta.url))));
test('both bikes initialize from one original world boundary with consistent shared bytes',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,45);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const r=loadLiveWorldEntry(fixture.files);assert.equal(r.bikes.length,2);assert.equal(r.tree.nodes.size,76);assert.equal(r.entry.dtBits,0x3c83126f);
 assert.deepEqual(r.bikes.map(b=>b.artifacts.bike.blockCount),[103,103]);
 const log=[],services=Object.fromEntries(['select','refresh','physics','presentation','localIdentity','remote','race','raceWorld','marker','children'].map(name=>[name,(object)=>{assert.notEqual(name,'localIdentity');log.push([name,object?.address??null]);}]));
 tickMcmWorldActors(r.context,r.delta,services);
 assert.deepEqual(log,[['refresh',0x51c8d40],['physics',0x51c8d40],['presentation',0x51c8d40],['physics',0x51f7598],['marker',0x1987100],['children',null]]);
 const later=JSON.parse(fixture.files['collision.json']),initial=r.bikes[0].artifacts.bike.blocks.find(b=>b.address===r.bikes[0].address),after=later.blocks.find(b=>b.address===initial.address);
 assert.notEqual(later.captureId,r.entry.captureId);assert.notEqual(initial.hex,after.hex);
});
test('world initialization rejects mixed boundaries and inconsistent shared allocations',()=>{
 const files={...fixture.files};files['world-bike-1.json']=fixture.files['checkpoint.json'];assert.throws(()=>loadLiveWorldEntry(files));
 const bad={...fixture.files},child=JSON.parse(bad['world-child-1.json']),bytes=Buffer.from(child.poolHex,'hex');bytes[0x10]^=1;child.poolHex=bytes.toString('hex');bad['world-child-1.json']=JSON.stringify(child);
 assert.throws(()=>loadLiveWorldEntry(bad),/Atomic world bytes differ/);
});
