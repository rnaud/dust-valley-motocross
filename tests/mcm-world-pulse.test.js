import {createWorldBikeRuntime} from '../scripts/mcm-reference/world-bike-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {validateWorldInputProtocol,worldThrottleAtFrame} from '../scripts/mcm-reference/world-input-protocol.mjs';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-pulse-wine11.json.br',import.meta.url))));
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('native world pulse proves applied controls, actual player acceleration and release',()=>{
 for(const [name,value] of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const input=validateWorldInputProtocol(fixture.files);assert.deepEqual(input.frames.map(f=>[f.throttle,f.queries]),[[0,5],[1,11],[1,11],[0,11]]);
 const player=JSON.parse(fixture.files['world-entry.json']).bikes[0],rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse).filter(r=>r.bike===player&&r.phase==='after-bike');
 const speeds=rows.map(r=>Buffer.from(r.bodyHex,'hex').readFloatLE(0x6a4));assert.ok(speeds[1]>speeds[0]);assert.ok(speeds[2]>speeds[1]);assert.ok(speeds[3]>0&&speeds[3]<speeds[2]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,46);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
});
test('retained player acceleration and release match alongside AI without physics-state reseeding',()=>{
 const result=analyzeWorldBikes(fixture.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.entryReports.length,8);assert.equal(result.reports.length,8);assert.equal(result.worldRiderReports.length,12);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});
test('declared pulse without applied evidence and input applied to AI are rejected',()=>{
 const missing={...fixture.files};delete missing['world-inputs.jsonl'];assert.throws(()=>validateWorldInputProtocol(missing),/Missing applied/);
 const wrong={...fixture.files},rows=wrong['world-inputs.jsonl'].trim().split('\n').map(JSON.parse);rows.find(r=>r.applied).bike=JSON.parse(wrong['world-entry.json']).bikes[1];wrong['world-inputs.jsonl']=rows.map(JSON.stringify).join('\n');assert.throws(()=>validateWorldInputProtocol(wrong),/non-player/);
});

test('a collision event can update the other initialized bike before its first physics turn',()=>{
 const initial=Object.fromEntries(Object.entries(fixture.files).filter(([name])=>name.startsWith('world-')&&(name.endsWith('.json')||/^world-mesh-[0-9]+\.jsonl$/.test(name))));
 const runtime=createWorldBikeRuntime(initial,terrain(),{throttle:0,brake:0}),address=runtime.world.entry.bikes[1],bike=runtime.bikes.get(address),c=bike.loaded.context,actor=runtime.ordered.actors.get(address);
 // Explicit synthetic launch event exercises initialization and shared RNG;
 // the separate native collision fixture verifies numerical event behavior.
 c.bike.fieldc40=1;const calls=runtime.random.calls;
 const result=actor.onCollisionEvent({bike:actor,dynamic:1,impulse:1,collisionType:0,otherCrashed:0});
 assert.equal(result.state,1);assert.equal(actor.state844,1);assert.equal(c.rider.kind,result.eventKind);
 assert.ok(result.randomCalls>=4);assert.equal(runtime.random.calls-calls,result.randomCalls);
 assert.equal(c.contactPhase.normalEventDecision.randomCalls,result.randomCalls);
 assert.deepEqual(c.rider.selected,result.rider.selected);
});

test('both bikes retain matching state after a normal original-game restart',()=>{
 const restarted=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-start-wine11.json.br',import.meta.url))));
 for(const [name,value] of Object.entries(restarted.files))assert.equal(createHash('sha256').update(value).digest('hex'),restarted.provenance.fileSha256[name]);
 assert.match(restarted.files['restart.log'],/menu=191 control=MBoxButTop .*foreground_verified=1/);
 assert.match(restarted.files['cleanup.log'],/debugger=0 clean=1/);
 assert.equal((restarted.files['cleanup.log'].match(/restored=1/g)||[]).length,46);
 const result=analyzeWorldBikes(restarted.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.entryReports.length,32);assert.equal(result.reports.length,32);assert.equal(result.worldRiderReports.length,60);
 assert.equal(Buffer.from(JSON.parse(restarted.files['world-child-0.json']).hex,'hex').length,0x610);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});

test('rider child comparison checks its final owned word and reports historical overread separately',()=>{
 const files={...fixture.files},rows=files['world-riders.jsonl'].trim().split('\n').map(JSON.parse),bytes=Buffer.from(rows[0].hex,'hex');
 assert.equal(bytes.length,0x618);
 bytes.writeUInt32LE((bytes.readUInt32LE(0x60c)^1)>>>0,0x60c);
 bytes.writeUInt32LE((bytes.readUInt32LE(0x614)^1)>>>0,0x614);
 rows[0].hex=bytes.toString('hex');files['world-riders.jsonl']=rows.map(JSON.stringify).join('\n');
 const first=analyzeWorldBikes(files,terrain(),{renderCameraInputs:true}).worldRiderReports[0].rider;
 assert.deepEqual(first.differences.map(d=>[d.name,d.offset]),[['child','0x60c']]);
 assert.equal(first.captureOverread.length,2);
 assert.notEqual(first.captureOverread[1].actual,first.captureOverread[1].expected);
});

test('sustained throttle holds for twelve updates, then releases, with native application evidence',()=>{
 const held=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-hold-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(held.files))assert.equal(createHash('sha256').update(value).digest('hex'),held.provenance.fileSha256[name]);
 const input=validateWorldInputProtocol(held.files);assert.equal(input.frames.length,16);
 assert.deepEqual(input.frames.map(f=>f.throttle),[...Array(12).fill(1),0,0,0,0]);
 const short={...held.files};short['world-bikes.jsonl']=short['world-bikes.jsonl'].trim().split('\n').slice(0,48).join('\n');
 assert.throws(()=>validateWorldInputProtocol(short),/include throttle release/);
 assert.throws(()=>worldThrottleAtFrame(input.protocol,-1),/Invalid world input frame/);
 const result=analyzeWorldBikes(held.files,terrain(),{renderCameraInputs:true});
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
 assert.match(held.files['cleanup.log'],/debugger=0 clean=1/);
});
