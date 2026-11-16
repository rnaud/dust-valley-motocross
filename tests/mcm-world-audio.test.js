import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createWorldBikeRuntime} from '../scripts/mcm-reference/world-bike-runtime.mjs';
import {connectWorldCollisionAudio} from '../scripts/mcm-reference/world-collision-audio.mjs';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-camera-wine11.json.br',import.meta.url))));
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('atomic live sound state is shared, disabled by captured device gates, and consumes the common RNG on contact',()=>{
 for(const [name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,46);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const runtime=createWorldBikeRuntime(fixture.files,terrain(),{throttle:0,brake:0}),audio=runtime.audio;
 assert.equal(audio.notifications.size,1);const shared=[...audio.notifications.values()][0],actor=runtime.ordered.actors.get(shared.state.selectedBike),other=runtime.ordered.actors.get(runtime.world.entry.bikes.find(a=>a!==actor.address));
 assert.ok(shared.initial.samples.every(s=>s.deviceEnabled===0&&s.buffer===0));assert.equal(shared.state.random,runtime.random);
 // Synthetic notification uses a known audible camera input. Native wrapper
 // fixtures separately validate the complete notification arithmetic/calls.
 audio.setCamera(shared.initial.cameraAddress,actor.position);const before=runtime.random.calls;
 actor.notification.handler(actor,10,0);assert.equal(runtime.random.calls,before+1);assert.ok(shared.calls.some(c=>c[0]==='play'));
 other.notification.handler(other,10,0);assert.equal(runtime.random.calls,before+1);
 audio.invalidateCamera();assert.throws(()=>actor.notification.handler(actor,10,0),/Current-frame/);
 const unsupported={...fixture.files},record=JSON.parse(unsupported['world-audio-0.json']);record.samples[0].deviceEnabled=1;unsupported['world-audio-0.json']=JSON.stringify(record);
 assert.throws(()=>connectWorldCollisionAudio(unsupported,runtime.world,runtime.ordered,runtime.random),/playback-status/);
});
test('captured audio initialization preserves the complete checked both-bike trajectory',()=>{
 const result=analyzeWorldBikes(fixture.files,terrain(),{renderCameraInputs:true});
 for(const group of ['entryReports','reports','collisionReports','riderReports','visualReports'])for(const report of result[group])assert.deepEqual(report.differences,[]);
 assert.equal(result.worldRiderReports.length,12);for(const report of result.worldRiderReports){assert.deepEqual(report.rider.differences,[]);assert.deepEqual(report.collision.differences,[]);}
});

test('current collision audio camera evidence must agree across both bike updates',()=>{
 const files={...fixture.files},rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 assert.equal(rows.filter(r=>r.audioCamera).length,8);
 rows[2].audioCamera.positionBits[0]^=1;
 files['world-bikes.jsonl']=rows.map(JSON.stringify).join('\n');
 assert.throws(()=>analyzeWorldBikes(files,terrain(),{renderCameraInputs:true}),/Audio camera changed/);
});
