import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {loadLiveWorldEntry} from '../scripts/mcm-reference/live-world-entry.mjs';
import {connectWorldRiderContexts} from '../scripts/mcm-reference/world-rider-contexts.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-world-dependencies-wine11.json.br',import.meta.url))));
test('world-entry controller, route and emitter state initializes two riders in one shared world',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,45);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const world=loadLiveWorldEntry(fixture.files);assert.ok(world.bikes[1].artifacts.aiEnvironment);assert.deepEqual(world.bikes.map(b=>b.emitters.length),[3,3]);
 const {ordered,riders,particles}=connectWorldRiderContexts(world,null),[player,ai]=riders.map(r=>r.external);
 assert.equal(player.context.manager,ai.context.manager);assert.equal(player.context.grid,ai.context.grid);
 assert.equal(player.context.rider,ordered.actors.get(0x51dd978));assert.equal(ai.context.rider,ordered.actors.get(0x523c2a0));
 assert.equal(player.context.bodyNode,ordered.actors.get(0x51c8d40).riderTransform);
 assert.equal(ai.context.bodyNode,ordered.actors.get(0x51f7598).riderTransform);
 assert.equal(player.pool,ai.pool);assert.equal(player.particleBytes,ai.particleBytes);assert.equal(player.poolBytes,ai.poolBytes);
 const count=particles.pool.count;player.pool.count=(count+1)%1001;assert.equal(ai.pool.count,(count+1)%1001);player.pool.count=count;
});
test('world dependency capture rejects missing initial AI data and mismatched spray aliases',()=>{
 const missing={...fixture.files};delete missing['world-ai-environment-1.json'];assert.throws(()=>loadLiveWorldEntry(missing),/Missing world-entry dependency/);
 const bad={...fixture.files},child=JSON.parse(bad['world-child-1.json']),bytes=Buffer.from(child.sprayHex,'hex');bytes[0x48]^=1;child.sprayHex=bytes.toString('hex');bad['world-child-1.json']=JSON.stringify(child);assert.throws(()=>loadLiveWorldEntry(bad),/Atomic world bytes differ/);
});
