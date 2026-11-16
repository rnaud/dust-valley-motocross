import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {validateWorldInputProtocol,worldThrottleAtFrame} from '../scripts/mcm-reference/world-input-protocol.mjs';
import {createWorldBikeRuntime} from '../scripts/mcm-reference/world-bike-runtime.mjs';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
import {compareLiveParticlePoolTicks} from '../scripts/mcm-reference/compare-live-particle-pool.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-pursuit-wine11.json.br',import.meta.url))));
test('child capture retains particle assertions and verifies original shared-pool calls',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-child-state-wine11.json.br',import.meta.url))));
 const text=captured.files['particle-observations.jsonl'];
 assert.equal(createHash('sha256').update(text).digest('hex'),captured.provenance.fileSha256['particle-observations.jsonl']);
 const rows=text.trim().split('\n').map(JSON.parse);
 assert.equal(rows.length,63);
 assert.equal(captured.provenance.retainedRows['rider.jsonl'].particleAssertions,63);
 for(const phase of ['before-dust','after-dust','before-spray','after-spray','before-pool','after-pool','before-particle-draw','before-particle-cull','after-particle-cull'])assert.equal(rows.filter(r=>r.phase===phase).length,7);
 const initial=JSON.parse(captured.files['world-child-0.json']);
 const result=compareLiveParticlePoolTicks([{...initial,phase:'initial-rider'},...rows]);
 assert.equal(result.ticks,7);assert.equal(result.differences,0);
 assert.ok(result.changedWords>0);
});
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('64-update controlled pursuit matches both bikes with verified input restoration',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal(fixture.provenance.retainedRows['frames.jsonl'].selected,64);
 assert.equal(fixture.provenance.sourceSha256['world-bikes.jsonl'],fixture.provenance.fileSha256['world-bikes.jsonl']);
 const protocol=validateWorldInputProtocol(fixture.files);assert.deepEqual(protocol.frames.map(f=>f.throttle),[...Array(48).fill(1),...Array(16).fill(0)]);
 const result=analyzeWorldBikes(fixture.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.reports.length,128);assert.equal(result.entryReports.length,128);assert.equal(result.worldRiderReports.length,252);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});
test('pursuit requires evidence of restored steering and rejects altered input application',()=>{
 const missing={...fixture.files,'capture.log':fixture.files['capture.log'].replace(/steering-restored[^\n]+\n/,'')};
 assert.throws(()=>validateWorldInputProtocol(missing),/restoration evidence/);
 const altered={...fixture.files},rows=altered['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 rows[0].frameInput.steerBits=0;altered['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n');
 assert.throws(()=>validateWorldInputProtocol(altered));
});
test('captured damping is connected explicitly and nonfinite values are rejected',()=>{
 const files={...fixture.files};
 for(let i=0;i<2;i++){const child=JSON.parse(files[`world-child-${i}.json`]);child.dampingBits=0x3d4ccccd;files[`world-child-${i}.json`]=JSON.stringify(child);}
 const runtime=createWorldBikeRuntime(files,terrain(),{throttle:0,brake:0});
 for(const bike of runtime.bikes.values())assert.equal(bike.external.context.damping,Math.fround(.05));
 const child=JSON.parse(files['world-child-0.json']);child.dampingBits=0x7fc00000;files['world-child-0.json']=JSON.stringify(child);
 assert.throws(()=>createWorldBikeRuntime(files,terrain(),{throttle:0,brake:0}),/Invalid captured rider damping/);
});
test('missing throttle queries require crash state at both captured boundaries',()=>{
 const files={...fixture.files},queries=files['world-inputs.jsonl'].trim().split('\n').map(JSON.parse);
 files['world-inputs.jsonl']=queries.filter(q=>!(q.applied&&q.frame===63)).map(JSON.stringify).join('\n');
 assert.throws(()=>validateWorldInputProtocol(files),/No applied input queries in frame 63/);
 const rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 for(const index of [252,253]){const bytes=Buffer.from(rows[index].bodyHex,'hex');bytes.writeUInt32LE(1,0x844);rows[index].bodyHex=bytes.toString('hex');}
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n');
 assert.equal(validateWorldInputProtocol(files).frames[63].skipped,'crash-state');
});

test('98-update two-bike run matches through native AI crash and recovery',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-crash-recovery-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 assert.equal(captured.provenance.retainedRows['frames.jsonl'].selected,98);
 // Crashed AI skips controller phases: record count cannot define pair count.
 assert.equal(captured.provenance.retainedRows['frames.jsonl'].physicsRows,385);
 const entry=JSON.parse(captured.files['world-entry.json']);
 const rows=captured.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 const aiTails=rows.filter(r=>r.bike===entry.bikes[1]&&r.phase==='after-bike');
 const states=aiTails.map(r=>Buffer.from(r.bodyHex,'hex').readUInt32LE(0x844));
 assert.deepEqual(states.slice(66,73),Array(7).fill(1));
 assert.equal(states[65],0);assert.equal(states[73],0);assert.equal(states.at(-1),0);
 const observations=captured.files['world-riders.jsonl'].trim().split('\n').map(JSON.parse);
 assert.ok(observations.every(r=>r.hex.length===0x610*2&&r.boundaryWords.length===2));
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.entryReports.length,196);assert.equal(result.reports.length,196);assert.equal(result.worldRiderReports.length,388);
 assert.equal(result.collisionReports.length,195);assert.equal(result.visualReports.length,195);
 assert.equal(result.sceneReports.length,97);assert.equal(result.drawReports.length,388);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});

test('stronger pursuit has an explicit protocol and preserves steering restoration checks',()=>{
 const files={...fixture.files},entry=JSON.parse(files['world-entry.json']);
 entry.steeringProtocol='player-pursuit-ai-v2';files['world-entry.json']=JSON.stringify(entry);
 const rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 for(const i of [0,1])rows[i].steeringOverride.appliedBits=0x3f000000;
 rows[0].frameInput.steerBits=0x3f000000;
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n');
 assert.equal(validateWorldInputProtocol(files).frames.length,64);
 entry.steeringProtocol='player-pursuit-ai-v1';files['world-entry.json']=JSON.stringify(entry);
 assert.throws(()=>validateWorldInputProtocol(files),/Invalid pursuit steering/);
 entry.steeringProtocol='player-pursuit-ai-v2';files['world-entry.json']=JSON.stringify(entry);
 rows[2].frameInput.steerBits=0x3f000000;files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n');
 assert.throws(()=>validateWorldInputProtocol(files),/Steering not restored before AI/);
});

test('native bike-to-bike contact and subsequent AI recovery match in a shared 98-update run',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-contact-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 const entry=JSON.parse(captured.files['world-entry.json']),[player,ai]=entry.bikes;
 assert.equal(entry.steeringProtocol,'player-pursuit-ai-v2');
 assert.equal(captured.provenance.retainedRows['frames.jsonl'].selected,98);
 assert.equal(captured.provenance.retainedRows['grid.jsonl'].selected,2);
 assert.match(captured.provenance.sourceSha256['grid.jsonl'],/^[a-f0-9]{64}$/);
 // Native collider +88 acquires the other bike's collider. Preserve the prior
 // observation as well: a persistent pointer alone is not a new impact.
 const [before,after]=captured.files['world-contact-grid.jsonl'].trim().split('\n').map(JSON.parse);
 assert.equal(after.sequence,before.sequence+1);assert.equal(after.completedBikeFrames,6);
 const playerCollider=row=>row.objects.find(o=>Buffer.from(o.hex,'hex').readUInt32LE(0x94)===player);
 const beforeBytes=Buffer.from(playerCollider(before).hex,'hex'),afterBytes=Buffer.from(playerCollider(after).hex,'hex');
 const other=after.objects.find(o=>o.address===afterBytes.readUInt32LE(0x88));
 assert.ok(other);assert.equal(Buffer.from(other.hex,'hex').readUInt32LE(0x94),ai);
 assert.notEqual(beforeBytes.readUInt32LE(0x88),other.address);
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true});
 const contacts=result.contactReports.filter(c=>[player,ai].includes(c.actor)&&[player,ai].includes(c.other));
 assert.equal(contacts.length,8);assert.ok(contacts.every(c=>c.frame===5));
 assert.deepEqual(contacts.map(c=>c.kind),[0,1,0,1,0,1,0,1]);
 assert.equal(result.entryReports.length,196);assert.equal(result.reports.length,196);assert.equal(result.worldRiderReports.length,388);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
 const tails=captured.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse).filter(r=>r.bike===ai&&r.phase==='after-bike');
 const states=tails.map(r=>Buffer.from(r.bodyHex,'hex').readUInt32LE(0x844));
 assert.ok(states.some(s=>s===1));assert.equal(states.at(-1),0);
});


test('long pursuit keeps its declared release boundary and requires release evidence',()=>{
 const protocol='player-throttle-frames-0-through-95';
 assert.deepEqual([0,47,48,95,96,160].map(frame=>worldThrottleAtFrame(protocol,frame)),[1,1,1,1,0,0]);
 const files={...fixture.files},entry=JSON.parse(files['world-entry.json']);
 entry.inputProtocol=protocol;files['world-entry.json']=JSON.stringify(entry);
 assert.throws(()=>validateWorldInputProtocol(files),/must include throttle release/);
});

test('160-update two-bike run matches player crash recovery and extended throttle release',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-player-recovery-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 const entry=JSON.parse(captured.files['world-entry.json']);
 assert.equal(entry.inputProtocol,'player-throttle-frames-0-through-95');
 assert.equal(captured.provenance.retainedRows['frames.jsonl'].selected,160);
 const tails=captured.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse).filter(r=>r.bike===entry.bikes[0]&&r.phase==='after-bike');
 const states=tails.map(r=>Buffer.from(r.bodyHex,'hex').readUInt32LE(0x844));
 assert.equal(states[130],0);assert.deepEqual(states.slice(131,134),[1,1,1]);assert.equal(states[134],0);assert.equal(states.at(-1),0);
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.entryReports.length,320);assert.equal(result.reports.length,320);assert.equal(result.worldRiderReports.length,636);
 assert.equal(result.collisionReports.length,319);assert.equal(result.visualReports.length,319);assert.equal(result.sceneReports.length,159);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});

test('native world scheduler drives both bikes through repeated rider contacts without differences',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scheduler-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 const entry=JSON.parse(captured.files['world-entry.json']);assert.equal(entry.refreshDevice.address,0);
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true});
 assert.equal(result.worldSchedulerReports.length,64);
 assert.equal(result.worldChildReports.length,63);
 assert.ok(result.worldChildReports.every(r=>r.riderOrder.length===2&&r.riderOrder.every((a,i)=>a===entry.bikes[i])));
 assert.ok(result.worldChildReports.every(r=>r.externalActors.length>0));
 assert.ok(result.worldSchedulerReports.every(r=>r.bikes===2&&r.markerRequests.length===1));
 assert.ok(result.contactReports.some(r=>r.kind===4));assert.ok(result.contactReports.some(r=>r.kind===5));
 assert.equal(result.entryReports.length,128);assert.equal(result.reports.length,128);assert.equal(result.worldRiderReports.length,252);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});

test('owned custom-actor initialization preserves the native two-bike child sequence',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-child-state-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 const actors=JSON.parse(captured.files['world-actor-tree.json']).nodes.filter(n=>n.ownedStateHex);
 assert.equal(actors.length,11);
 for(const actor of actors){const bytes=Buffer.from(actor.ownedStateHex,'hex');assert.equal(bytes.length,bytes.readUInt32LE(8));assert.equal(bytes.subarray(0,0x30).toString('hex'),actor.hex);}
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true,particleIntegration:true});
 assert.equal(result.worldChildReports.length,7);assert.ok(result.worldChildReports.every(r=>r.riderOrder.length===2&&r.externalActors.length===3));
 assert.equal(result.particleReports.length,63);
 for(const report of result.particleReports)assert.equal(report.differences,0,`${report.phase} frame ${report.frame}`);
 assert.equal(result.entryReports.length,16);assert.equal(result.reports.length,16);assert.equal(result.worldRiderReports.length,28);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});

test('64-update shared emitter and pool integration matches both bikes and all presentation boundaries',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-particles-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true,particleIntegration:true});
 assert.equal(result.particleReports.length,569);
 for(const report of result.particleReports)assert.equal(report.differences,0,`${report.phase} frame ${report.frame}`);
 assert.equal(result.entryReports.length,128);assert.equal(result.reports.length,128);assert.equal(result.worldRiderReports.length,252);
 assert.equal(result.worldChildReports.length,63);assert.ok(result.worldChildReports.every(r=>r.externalActors.length===3));
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});

test('163-update recovery retains shared particles across original rider-bike contacts',()=>{
 const captured=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-particle-recovery-wine11.json.br',import.meta.url))));
 for(const [name,value]of Object.entries(captured.files))assert.equal(createHash('sha256').update(value).digest('hex'),captured.provenance.fileSha256[name]);
 const result=analyzeWorldBikes(captured.files,terrain(),{renderCameraInputs:true,particleIntegration:true});
 assert.equal(result.particleReports.length,1463);
 for(const report of result.particleReports)assert.equal(report.differences,0,`${report.phase} frame ${report.frame}`);
 assert.equal(result.entryReports.length,326);assert.equal(result.reports.length,326);assert.equal(result.worldRiderReports.length,648);
 assert.equal(result.contactReports.length,18);
 assert.deepEqual([...new Set(result.contactReports.map(r=>r.kind))].sort(),[0,1,2,3]);
 // This recording covers rider-bike contact, not an active impact burst.
 assert.equal(result.impactReports.filter(r=>r.phase==='before'&&r.active).length,0);
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[],`${group} frame ${report.frame}`);
 for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
 for(const report of [...result.entryReports,...result.reports])assert.equal(report.random.actual,report.random.expected);
});
