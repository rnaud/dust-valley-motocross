import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {analyzeWorldWriters} from '../scripts/mcm-reference/analyze-world-writers.mjs';
import {analyzeMovingVisibility} from '../scripts/mcm-reference/analyze-moving-visibility.mjs';
import {compareLiveRetainedRiderFrames} from '../scripts/mcm-reference/compare-live-retained-rider-frames.mjs';
const read=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-writers-wine11.json.br',import.meta.url))));
const run=f=>analyzeWorldWriters(f.render,f.rows,f.world);
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('ordered invocation inputs predict every competing writer and next bike scratch value',()=>{
 const f=read(),r=run(f);
 assert.equal(r.applications,8386);assert.equal(r.derivedActorApplications,52);assert.equal(r.derivedChildWrappers,82);assert.equal(r.observedRootWrappers,82);assert.equal(r.observedNonActorApplications,8334);assert.deepEqual(r.bindings,{applications:8386,commands:310,stores:310,overlaps:28});
 assert.deepEqual(r.counts,{hud:82,sse:24,binding:28,heap:4});assert.equal(r.uploads.uploads,1876);assert.equal(r.uploads.allocatedBytes,199732);
 assert.equal(r.clockChecks,41);assert.equal(r.refreshes,41);assert.equal(r.lineCalls,82);assert.equal(r.checks.length,41);
 assert.deepEqual(r.checks.reduce((o,c)=>(o[c.kind]=(o[c.kind]??0)+1,o),{}),{heap:1,sse:23,binding:4,hud:13});
 assert.match(f.provenance.cleanup,/debugger=0 clean=1/);assert.equal((f.provenance.cleanup.match(/restored=1/g)||[]).length,174);
 assert.match(f.provenance.run,/captured=84 status=1/);
});
test('computed world writes feed retained physics while culling remains derived from actor geometry',()=>{
 const f=read(),writers=run(f),byFrame=new Map(writers.checks.map(c=>[c.frame,{address:f.world.scratch,value:c.value}]));f.input.terrain=terrain();
 const render=f.render.filter(r=>['wrapper','wrapper-cull','store-before','store-after'].includes(r.phase));
 const r=analyzeMovingVisibility(f.input,f.rows,f.events,render,Float32Array.from(f.world.worldMatrix),{worldCallerWrites:({frame})=>byFrame.has(frame)?[byFrame.get(frame)]:[]});
 assert.deepEqual([r.bikeFrames,r.riderTicks,r.physicsDifferences,r.visualDifferences],[42,41,0,881090]);
 assert.equal(r.callerScratchMode,'modeled-world');assert.equal(r.modeledCallerScratchWords,41);assert.equal(r.observedCallerScratchWords,0);
 assert.deepEqual([r.geometrySamples,r.accepted,r.rejected,r.sseStores],[82,52,30,24]);assert.match(r.physicsScope,/invocation order and graphics state inputs are not fully recovered/);
});
test('paired native output corruption and missing invocation observations cannot become model writes',()=>{
 const mutations=[
  f=>{const a=f.render.find(r=>r.phase==='store-before'),b=f.render.find(r=>r.phase==='store-after');a.value^=1;b.value^=1;},
  f=>{f.render.find(r=>r.phase==='hud-line-clear'&&r.stage===169).value=1;},
  f=>{f.render.find(r=>r.phase==='heap-store-value'&&r.address===f.world.scratch).value^=1;},
  f=>{const r=f.render.find(r=>r.phase==='bike-function-entry'&&r.ecx===f.world.player);r.value^=1;const next=f.rows[(r.frame+1)*2],bytes=Buffer.from(next.stackHex,'hex');bytes.writeUInt32LE(r.value,0x54);next.stackHex=bytes.toString('hex');},
  f=>{const i=f.render.findIndex(r=>r.phase==='bike-function-entry'&&r.ecx===f.world.player);f.render.splice(i,1);},
 ];
 for(const mutate of mutations){const f=read();mutate(f);assert.throws(()=>run(f));}
});
test('modeled-world replay rejects observed scratch mixing and unsupported memory writes',()=>{
 assert.throws(()=>compareLiveRetainedRiderFrames({},[],[],{observedCallerDriveScratch:true,worldCallerWrites:()=>[]}),/Cannot combine/);
 const f=read();f.input.terrain=terrain();
 assert.throws(()=>compareLiveRetainedRiderFrames(f.input,f.rows,f.events,{worldCallerWrites:()=>[{address:f.world.scratch+4,value:0}]}),/Unsupported modeled world store/);
});
