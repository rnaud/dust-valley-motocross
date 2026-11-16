import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const fixture=(name='ai-substeps')=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
function input(f=fixture()){
 const json=name=>JSON.parse(f.files[name+'.json']),rows=f.files['frames.jsonl'].trim().split('\n').map(JSON.parse);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {checkpoint:json('checkpoint'),animations:json('animations'),environment:json('environment'),collision:json('collision'),aiEnvironment:json('ai-environment'),row:rows.find(r=>r.phase==='before-update'),terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale},throttle:0,brake:0,rows,...(f.files['draws.jsonl']?{draws:f.files['draws.jsonl'].trim().split('\n').map(JSON.parse)}:{})};
}
import {analyzeAiSubsteps} from '../scripts/mcm-reference/analyze-ai-substeps.mjs';
const trace=f=>f.files['substeps.jsonl'].trim().split('\n').map(JSON.parse);
const rider=f=>f.files['rider.jsonl'].trim().split('\n').map(JSON.parse);
test('retained spray ticks preserve the complete native tables across eight inactive frames',()=>{
 const f=fixture('ai-spray-inactive');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,35);
 const i=input(f),events=rider(f),r=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,489);assert.equal(r.componentWords,5868);assert.deepEqual(r.visualDifferences,[]);
 assert.deepEqual(r.sprayReports.map(s=>s.emitted),Array(7).fill(0));
 assert.deepEqual(r.sprayReports[0].exit,{words:20049,differences:0});
 assert.equal(r.particleDifferences.length,22688);
 assert.ok(r.particleDifferences.every(d=>d.name==='particles'&&[0x24,0x2c,0x30,0x44].includes(d.offset%0x48)));
 const after=events.find(e=>e.phase==='after-spray'),bytes=Buffer.from(after.emitterHex,'hex');bytes[0x484]^=1;after.emitterHex=bytes.toString('hex');
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,events,trace(f)),/Retained spray return/);
 const missing=rider(f);missing.splice(missing.findIndex(e=>e.phase==='after-spray'),1);missing.forEach((e,n)=>e.eventSequence=n);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,missing,trace(f)),/Missing spray return/);
});
test('longer spray observation preserves the unresolved rider-child tail mismatch',()=>{
 const f=fixture('ai-spray-child-tail');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,35);
 const i=input(f);
 assert.equal(i.rows.filter(r=>r.phase==='before-update').length,16);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),trace(f)),/AI before-rider child 614/);
});
test('render transform-cache writes remain an explicit retained-world parity failure',()=>{
 const f=fixture('ai-substeps-render-cache');
 for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);
 assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,17);
 const i=input(f),events=rider(f);
 // Original mesh update 445690 resolves 21 component nodes before each scene
 // query. Its invocations/eligibility are not yet part of the retained model.
 for(let frame=1;frame<=3;frame++)assert.equal(events.filter(e=>e.completedBikeFrames===frame&&e.phase==='world-query'&&e.caller===0x445711).length,21);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,events,trace(f)),/Scene resolver call chain at frame 0/);
});
test('eight retained original AI frames match every observed substep body and component word',()=>{
 const f=fixture();for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,17);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,8);assert.deepEqual(r.substeps,Array(8).fill(11));
 assert.equal(r.substepBoundaries,478);assert.equal(r.substepBodyBytes,478*0xcc8);assert.equal(r.componentWords,478*12);assert.equal(r.controlSkipped,50);
 assert.equal(r.bodyBoundaries,32);assert.equal(r.randomDraws,5);assert.equal(r.visualDifferences.length,0);
 assert.equal(r.riderBytes,35000);assert.equal(r.particleDifferences.length,107874);
});
test('substep comparison rejects changed intermediate body and suspension outputs',()=>{
 for(const kind of ['body','component']){
  const f=fixture(),i=input(f),rows=trace(f),row=rows.find(r=>r.frame===1&&r.phase==='tires');
  const bike=row.blocks.find(b=>b.address===row.bike),address=kind==='body'?row.bike:Buffer.from(bike.hex,'hex').readUInt32LE(0x8e4);
  const block=row.blocks.find(b=>b.address===address),bytes=Buffer.from(block.hex,'hex');bytes[kind==='body'?0x510:0x5c]^=1;block.hex=bytes.toString('hex');
  assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),rows),kind==='body'?/step 0 tires body 510/:/step 0 tires component 8e4\+5c/);
 }
});
test('substep comparison rejects missing boundaries and invented control visits',()=>{
 for(const kind of ['missing','invented','identity']){
  const f=fixture(),i=input(f),rows=trace(f);
  if(kind==='missing')rows.splice(rows.findIndex(r=>r.phase==='motion'),1);
  else if(kind==='identity')rows[0].captureId='different-capture';
  else{
   const index=rows.findIndex((r,j)=>r.phase==='rider'&&rows[j-1].phase==='motion');assert.ok(index>0);
   rows.splice(index,0,{...rows[index],phase:'controls'});
  }
  assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),rows));
 }
});
test('airborne redirection uses the component cached basis across retained trick frames',()=>{
 const f=fixture('ai-substeps-control-source');for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,4);assert.deepEqual(r.substeps,[11,11,10,11]);assert.equal(r.substepBoundaries,237);
 assert.equal(r.componentWords,2844);assert.equal(r.bodyBoundaries,16);assert.deepEqual(r.visualDifferences,[]);
 assert.equal(r.particleDifferences.length,7412);
 const loaded=loadLiveFrameBootstrap(i),c=loaded.context,m=checkpointMemory(i.checkpoint);
 assert.equal(c.baseNode.address,m.u32(m.u32(i.checkpoint.bikeAddress+0x8d8)));assert.notEqual(c.baseNode,c.bodyNode);
 assert.equal(c.baseNode,c.aiController.runtime.setup.graph.source);
});


test('retained draw rectangles, recursive LOD and mesh caches match eight original AI frames',()=>{
 const f=fixture('ai-draw-world');
 for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,19);
 assert.match(f.provenance.note,/Controlled camera target/);assert.match(f.files['camera-restoration.log'],/target_changed=051f7598->051c8d40 verified=1/);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,480);assert.equal(r.componentWords,5760);
 assert.deepEqual(r.visualDifferences,[]);assert.equal(r.drawNodeWords,24150);assert.equal(r.drawReports.length,14);
 assert.equal(r.drawReports.filter(d=>d.accepted).length,2);assert.equal(r.drawReports.reduce((n,d)=>n+d.queries,0),24);
 assert.equal(r.particleDifferences.length,53214);assert.equal(r.riderBytes,35000);
 const bike=i.checkpoint.bikeAddress;
 assert.equal(i.draws.find(d=>d.phase==='after-draw'&&d.actor===bike&&d.completedBikeFrames===5).selection,2);
 delete i.draws;
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),trace(f)),/body 488/);
});
test('draw outputs and observed query targets cannot steer retained rendering state',()=>{
 for(const kind of ['rectangle','lod','query']){
  const f=fixture('ai-draw-world'),i=input(f),events=rider(f);
  if(kind==='query')events.find(e=>e.phase==='world-query'&&e.caller===0x445711).node^=4;
  else{
   const out=i.draws.find(d=>d.phase==='after-draw'&&d.actor===i.checkpoint.bikeAddress&&d.completedBikeFrames===5);
   if(kind==='rectangle')out.rect[0]^=1;
   else out.lodNodes.find(n=>n.address===out.node).index^=1;
  }
  assert.throws(()=>analyzeAiSubsteps(i,i.rows,events,trace(f)),kind==='rectangle'?/Computed screen rectangle/:kind==='lod'?/Computed recursive LOD/:/Computed mesh query target/);
 }
});

test('rider orientation resets use the base component through visible bike and rider draws',()=>{
 const f=fixture('ai-rider-orientation');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,19);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,454);assert.equal(r.componentWords,5448);
 assert.deepEqual(r.visualDifferences,[]);assert.equal(r.riderBytes,35000);assert.equal(r.randomDraws,6);
 assert.equal(r.drawNodeWords,24150);assert.equal(r.drawReports.length,14);
 const visible=r.drawReports.filter(d=>d.accepted),bike=i.checkpoint.bikeAddress;
 assert.equal(visible.filter(d=>d.actor===bike).length,4);assert.equal(visible.filter(d=>d.actor!==bike).length,4);
 assert.equal(visible.reduce((n,d)=>n+d.queries,0),168);
 assert.equal(r.particleDifferences.length,47716);
});

test('shared pool ticks retain state using their actual native timing and report external writers',()=>{
 const f=fixture('ai-pool-world');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,22);
 const i=input(f),events=rider(f),r=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.equal(r.frames,8);assert.equal(r.substepBoundaries,474);assert.equal(r.componentWords,5688);assert.equal(r.bodyBoundaries,32);
 assert.deepEqual(r.visualDifferences,[]);assert.equal(r.poolReports.length,7);
 assert.deepEqual(r.poolReports.map(p=>p.dtBits),events.filter(e=>e.phase==='before-pool').map(e=>e.dtBits));
 assert.ok(r.poolReports.every(p=>p.entry.words===20049&&p.exit.words===20049));
 assert.equal(r.particleDifferences.length,99534);
 assert.deepEqual(r.particleDifferences[0],{frame:0,stage:'before-rider',name:'pool',offset:0x30,actual:12,expected:107});
 // Corrupt one observed age at pool entry. Only that comparison changes:
 // native output is not imported into subsequent retained state.
 const entry=events.find(e=>e.phase==='before-pool'),bytes=Buffer.from(entry.particlesHex,'hex');bytes[0x14]^=1;entry.particlesHex=bytes.toString('hex');
 const changed=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.deepEqual(changed.poolReports.map(p=>p.exit),r.poolReports.map(p=>p.exit));
 assert.deepEqual(changed.particleDifferences.filter(d=>d.stage!=='before-pool'),r.particleDifferences.filter(d=>d.stage!=='before-pool'));
 assert.notDeepEqual(changed.particleDifferences.filter(d=>d.stage==='before-pool'),r.particleDifferences.filter(d=>d.stage==='before-pool'));
 const missing=rider(f);missing.splice(missing.findIndex(e=>e.phase==='after-pool'),1);missing.forEach((e,n)=>e.eventSequence=n);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,missing,trace(f)),/Missing pool return/);
});

test('dust updates retain emitter state and connect the original shared particle writes',()=>{
 const f=fixture('ai-dust-world');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,29);
 const i=input(f),events=rider(f),r=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,474);assert.equal(r.componentWords,5688);assert.deepEqual(r.visualDifferences,[]);
 assert.equal(r.dustReports.length,7);assert.equal(r.poolReports.length,7);
 assert.deepEqual(r.dustReports.map(d=>d.emitted),[58,104,118,171,0,0,0]);
 assert.deepEqual(r.dustReports[0].entry,{words:20049,differences:0});assert.deepEqual(r.dustReports[0].exit,{words:20049,differences:0});
 assert.equal(r.particleDifferences.length,433309);
 const after=events.find(e=>e.phase==='after-dust'),bytes=Buffer.from(after.emitterHex,'hex');bytes[0x60]^=1;after.emitterHex=bytes.toString('hex');
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,events,trace(f)),/Retained dust return/);
 const missing=rider(f);missing.splice(missing.findIndex(e=>e.phase==='after-dust'),1);missing.forEach((e,n)=>e.eventSequence=n);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,missing,trace(f)),/Missing dust return/);
});

test('particle draw preparation and visibility retain all checked state across eight original frames',()=>{
 const f=fixture('ai-particle-draw');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,38);
 const i=input(f),events=rider(f),r=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,528);assert.equal(r.componentWords,6336);assert.equal(r.drawNodeWords,24150);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);
 assert.equal(r.particleDrawReports.length,7);
 assert.ok(r.particleDrawReports.every(d=>d.accepted===0&&['entry','prepared','exit'].every(k=>d[k].words===20049&&d[k].differences===0)));
 // Native output corruption changes only its comparison, never subsequent state.
 const after=events.find(e=>e.phase==='after-particle-cull'),bytes=Buffer.from(after.particlesHex,'hex');bytes[0x44]^=1;after.particlesHex=bytes.toString('hex');
 const changed=analyzeAiSubsteps(i,i.rows,events,trace(f));assert.equal(changed.particleDifferences.length,1);assert.equal(changed.particleDifferences[0].stage,'after-particle-cull');assert.deepEqual(changed.visualDifferences,[]);
 const positions=rider(f),projected=positions.find(e=>e.phase==='before-particle-cull'),p=Buffer.from(projected.inputHex,'hex');p[0]^=1;projected.inputHex=p.toString('hex');
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,positions,trace(f)),/Retained particle draw positions/);
 const missing=rider(f);missing.splice(missing.findIndex(e=>e.phase==='after-particle-cull'),1);missing.forEach((e,n)=>e.eventSequence=n);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,missing,trace(f)),/Missing particle cull return/);
});

test('device matrices produce original particle projection without observed projected inputs',()=>{
 const f=fixture('ai-particle-projection');
 assert.equal(f.provenance.ddrawSha256,'be2964ddd67d148bcf87c4a1eedf8cf5e1ccc39eb7c87f3079df181d80fbea29');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,38);
 const i=input(f),events=rider(f),r=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,501);assert.equal(r.componentWords,6012);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);assert.equal(r.particleDrawReports.length,7);
 assert.ok(r.particleDrawReports.every(d=>d.projectionMode==='computed-from-device-matrices'&&d.accepted===0));
 assert.equal(events.filter(e=>e.phase==='before-particle-cull').reduce((n,e)=>n+e.projectedHex.length/64,0),1294);
 // Corrupt both paired native projections: they cannot become model inputs.
 for(const phase of ['before-particle-cull','after-particle-cull']){const e=events.find(e=>e.phase===phase),b=Buffer.from(e.projectedHex,'hex');b[0]^=1;e.projectedHex=b.toString('hex');}
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,events,trace(f)),/Computed particle projection/);
 const missing=rider(f);delete missing.find(e=>e.phase==='before-particle-cull').projectionMatricesHex;
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,missing,trace(f)),/Missing particle device matrices/);
 const changed=rider(f);changed.find(e=>e.phase==='before-particle-cull').projectionMatricesHex='00'.repeat(192);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,changed,trace(f)),/Computed particle projection/);
});

test('retained AI replay can initialize during an original active trick',()=>{
 const f=fixture('ai-active-trick-entry');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,40);
 assert.match(f.files['camera-restoration.log'],/target_changed=051f7598->051c8d40 verified=1/);
 const i=input(f),m=checkpointMemory(i.checkpoint),a=i.checkpoint.bikeAddress;
 assert.equal(m.u32(a+0x710),1);assert.equal(m.u32(a+0x844),0);assert.equal(m.u32(a+0xbfc),0);assert.ok((m.u32(a+0x814)&255)<16);
 const r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,8);assert.equal(r.bodyBoundaries,32);assert.equal(r.substepBoundaries,465);assert.equal(r.componentWords,5580);assert.equal(r.randomDraws,6);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);assert.equal(r.riderBytes,35000);assert.equal(r.drawNodeWords,24150);
 assert.equal(r.particleDrawReports.length,5);assert.ok(r.particleDrawReports.every(d=>d.accepted===0&&d.projectionMode==='computed-from-device-matrices'));
 // Initializing a trick does not authorize importing later observed outputs.
 const changed=trace(f),sample=changed.find(e=>e.phase==='contact'),block=sample.blocks.find(b=>b.address===sample.bike),body=Buffer.from(block.hex,'hex');body[0x710]^=1;block.hex=body.toString('hex');
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),changed),/body 710/);
});

test('active-trick initialization keeps normal-only and unsupported-state guards',async()=>{
 const {loadLiveNormalRider}=await import('../scripts/mcm-reference/live-normal-rider.mjs');
 const original=input(fixture('ai-active-trick-entry'));
 assert.throws(()=>loadLiveNormalRider(original.checkpoint,original.animations),/Unsupported normal rider state/);
 for(const [offset,value]of [[0x844,1],[0xbfc,2],[0x814,255]]){
  const i=input(fixture('ai-active-trick-entry')),block=i.checkpoint.blocks.find(b=>b.address===i.checkpoint.bikeAddress),bytes=Buffer.from(block.hex,'hex');bytes.writeUInt32LE(value,offset);block.hex=bytes.toString('hex');
  assert.throws(()=>loadLiveNormalRider(i.checkpoint,i.animations,{allowRetainedTrick:true}),/Unsupported normal rider state/);
 }
 const i=input(fixture('ai-active-trick-entry'));delete i.animations.retainedFrames;
 assert.throws(()=>loadLiveNormalRider(i.checkpoint,i.animations,{allowRetainedTrick:true}),/Unsupported normal rider state/);
});

for(const [name,audited,frames,snapshotCount,substeps]of [['audit',true,4,34,241],['fast',false,8,78,498]])test(`particle batch ${name} capture retains original physics and pool bytes`,()=>{
 const f=fixture('ai-particle-batch-'+name);
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,40);
 const events=rider(f),snapshots=events.filter(e=>e.particlesHex!==undefined);
 assert.equal(snapshots.length,snapshotCount);assert.ok(snapshots.every(e=>e.particleBatchAudited===audited));
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,events,trace(f));
 assert.equal(r.frames,frames);assert.equal(r.bodyBoundaries,frames*4);assert.equal(r.substepBoundaries,substeps);assert.equal(r.componentWords,substeps*12);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);
});

test('buffered per-record output retains original frame, substep and shared-world observations',()=>{
 const f=fixture('ai-buffered-observation');
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,40);
 assert.match(f.files['capture.log'],/capture-profile .*events=12488 snapshots=16 reads=30871 requestedBytes=36016892/);
 assert.match(f.files['capture.log'],/capture-profile-hook address=004b6930 hits=4687/);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,4);assert.equal(r.bodyBoundaries,16);assert.equal(r.substepBoundaries,237);assert.equal(r.componentWords,2844);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);
});

for(const [name,frames,steps,queries,transitions]of [['query',4,240,51,14],['substep',8,454,247,30]])test(`${name} hook gating preserves required original observations`,()=>{
 const f=fixture(`ai-${name}-gating`);
 for(const [key,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[key]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,40);
 assert.ok(f.files['capture.log'].includes(`capture-query-gate enabled=1 transitions=${transitions}`));
 if(name==='substep')assert.match(f.files['capture.log'],/capture-substep-gate enabled=1 transitions=102/);
 const i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,frames);assert.equal(r.bodyBoundaries,frames*4);assert.equal(r.substepBoundaries,steps);assert.equal(r.componentWords,steps*12);assert.equal(r.worldQueries.length,queries);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);
 const missingQuery=rider(f);missingQuery.splice(missingQuery.findIndex(e=>e.phase==='world-query'),1);missingQuery.forEach((e,n)=>e.eventSequence=n);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,missingQuery,trace(f)));
 const missingStep=trace(f);missingStep.splice(missingStep.findIndex(e=>e.phase==='contact'),1);
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,rider(f),missingStep));
});

test('retained rider collision projection exposes shared-grid divergence without reseeding',()=>{
 const f=fixture('ai-substep-gating'),i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.collisionStatus,'diverged');assert.equal(r.collisionBoundaries,47);assert.equal(r.collisionWords,10011);assert.equal(r.collisionDifferences.length,76);
 assert.ok(r.collisionDifferences.every(d=>d.name==='entries'&&[0,4].includes(d.offset)));
 assert.deepEqual(r.collisionDifferences[0],{frame:0,stage:'before-rider',name:'entries',offset:0,actual:0x1b405d0,expected:0x518b9b8});
 // Shape, callbacks, contacts and every pair-row/column word are also checked.
 // Corrupting an observed shape or pair cannot become retained model state.
 const changed=rider(f),e=changed.find(e=>e.phase==='after-rider');
 for(const [field,offset]of [['stateHex',0x64],['pairRowHex',0],['pairColumnHex',0]]){const b=Buffer.from(e.riderCollision[field],'hex');b[offset]^=1;e.riderCollision[field]=b.toString('hex');}
 const mutation=analyzeAiSubsteps(i,i.rows,changed,trace(f));
 assert.equal(mutation.collisionDifferences.length,79);
 assert.ok(mutation.collisionDifferences.some(d=>d.stage==='after-rider'&&d.name==='state'&&d.offset===0x64));
 assert.ok(mutation.collisionDifferences.some(d=>d.name==='pairRow'&&d.offset===0));
 assert.ok(mutation.collisionDifferences.some(d=>d.name==='pairColumn'&&d.offset===0));
 const missing=input(f);delete missing.rows.find(r=>r.phase==='before-update').riderCollision;
 assert.throws(()=>analyzeAiSubsteps(missing,missing.rows,rider(f),trace(f)),/Missing rider collision observation/);
 const stripped=input(f),strippedEvents=rider(f);for(const e of [...stripped.rows,...strippedEvents])delete e.riderCollision;
 assert.throws(()=>analyzeAiSubsteps(stripped,stripped.rows,strippedEvents,trace(f)),/Missing rider collision observation/);
 const ownership=rider(f);ownership.find(e=>e.phase==='before-rider').riderCollision.entriesAddress+=24;
 assert.throws(()=>analyzeAiSubsteps(i,i.rows,ownership,trace(f)),/collision ownership differs/);
});

test('all-grid capture also validates live visible particle quads while retaining collision divergence',()=>{
 const f=fixture('ai-all-grid'),i=input(f),r=analyzeAiSubsteps(i,i.rows,rider(f),trace(f));
 assert.equal(r.frames,4);assert.equal(r.substepBoundaries,208);assert.equal(r.componentWords,2496);
 assert.deepEqual(r.visualDifferences,[]);assert.deepEqual(r.particleDifferences,[]);
 assert.deepEqual(r.particleDrawReports.map(p=>p.accepted),[14,0,1]);
 assert.deepEqual(r.particleDrawReports.filter(p=>p.quads).map(p=>p.quads.vertexWords),[448,32]);
 assert.equal(r.collisionStatus,'diverged');assert.equal(r.collisionDifferences.length,32);
});
