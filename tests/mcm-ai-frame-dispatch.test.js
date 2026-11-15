import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeAiFrame} from '../scripts/mcm-reference/analyze-ai-frame.mjs';
import {analyzeAiFrameSequence} from '../scripts/mcm-reference/analyze-ai-frame-sequence.mjs';
import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
const fixture=(name='ai-frame-dispatch')=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/${name}-wine11.json.br`,import.meta.url))));
function input(f=fixture()){
 const json=name=>JSON.parse(f.files[name+'.json']),rows=f.files['frames.jsonl'].trim().split('\n').map(JSON.parse);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {checkpoint:json('checkpoint'),animations:json('animations'),environment:json('environment'),collision:json('collision'),aiEnvironment:json('ai-environment'),row:rows.find(r=>r.phase==='before-update'),terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale},throttle:0,brake:0,rows};
}
test('connected AI frame matches original controller, steering and frame tail without reseeding',()=>{
 const f=fixture();assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,6);
 const i=input(f);assert.deepEqual(analyzeAiFrame(i,i.rows),{frames:1,substeps:2,boundaries:3,comparedBytes:4198424,graphRecords:78,randomDraws:1});
});
test('connected comparison rejects changed controller graph, steering scratch and tail body',()=>{
 for(const kind of ['graph','steering','tail']){
  const i=input(),row=i.rows.find(r=>r.phase===(kind==='graph'?'after-ai-controller':kind==='steering'?'after-ai-steering':'after-update'));
  if(kind==='graph'){const record=row.visualState.find(r=>r.size===0x114),b=Buffer.from(record.hex,'hex');b[0x84]^=1;record.hex=b.toString('hex');}
  else{const key=kind==='steering'?'stackHex':'stateHex',b=Buffer.from(row[key],'hex');b[kind==='steering'?0x28:0x6f4]^=1;row[key]=b.toString('hex');}
  assert.throws(()=>analyzeAiFrame(i,i.rows),kind==='graph'?/visual/:kind==='steering'?/steering rate/:/frame-tail body/);
 }
});
test('AI environment stays at entry and shares live state without mutating it for comparisons',()=>{
 const i=input(),loaded=loadLiveFrameBootstrap(i),c=loaded.context,bridge=c.aiController,body=Buffer.from(new Uint8Array(bridge.body.buffer,bridge.body.byteOffset,bridge.body.byteLength));
 c.bike.velocity[0]+=2;const projected=bridge.projectBody();assert.equal(projected.getFloat32(0x510,true),Math.fround(c.bike.velocity[0]));assert.deepEqual(Buffer.from(new Uint8Array(bridge.body.buffer,bridge.body.byteOffset,bridge.body.byteLength)),body);
 assert.equal(c.frameRider.bikeAnimation.boundsMin,c.bike.boundsMin);assert.equal(bridge.runtime.setup.graph.target,c.bodyNode);assert.equal(bridge.environment.random,loaded.random);
 assert.equal(bridge.environment.firstActors.find(a=>a.id===i.checkpoint.bikeAddress).body,bridge.body);
 const player=bridge.environment.player,live=loaded.ordered.actors.get(player.id);live.position[0]+=3;bridge.environment.refreshActors();assert.equal(player.body.getFloat32(0x4f8,true),Math.fround(live.position[0]));
});
test('AI frame environment rejects mismatched captures and conflicting actor bodies',()=>{
 const mixed=input();mixed.aiEnvironment.captureId='0000000000000000';assert.throws(()=>loadLiveFrameBootstrap(mixed),/AI environment boundary/);
 const i=input(),m=checkpointMemory(i.checkpoint),w=checkpointMemory({...i.aiEnvironment,kind:'mcm-partial-local-checkpoint'}),player=w.u32(m.u32(i.checkpoint.bikeAddress+0x41c)+0x30),record=i.aiEnvironment.blocks.find(b=>b.address===player),bytes=Buffer.from(record.hex,'hex');bytes[0x4f8]^=1;record.hex=bytes.toString('hex');assert.throws(()=>loadLiveFrameBootstrap(i),/AI actor collision snapshot/);
});

test('connected grounded AI frame also matches controller through contact physics and frame tail',()=>{
 const f=fixture('ai-frame-grounded');for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,6);
 const i=input(f);assert.equal(Buffer.from(i.row.stateHex,'hex').readUInt32LE(0x4bc),0);assert.equal(Buffer.from(i.rows.find(r=>r.phase==='after-update').stateHex,'hex').readUInt32LE(0x4bc),0);
 assert.deepEqual(analyzeAiFrame(i,i.rows),{frames:1,substeps:2,boundaries:3,comparedBytes:4198424,graphRecords:78,randomDraws:0});
});

test('consecutive AI frames retain exact body and RNG while exposing unresolved visual cache writes',()=>{
 const f=fixture('ai-frame-sequence');for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');assert.match(f.files['capture.log'],/captured=8 status=1/);assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,6);
 const i=input(f),r=analyzeAiFrameSequence(i,i.rows);
 assert.equal(r.frames,2);assert.equal(r.bodyBoundaries,8);assert.equal(r.bodyBytes,26176);assert.deepEqual(r.substeps,[2,11]);assert.equal(r.randomDraws,2);
 // Preserve the actual capture stall; this is not normal-rate trajectory proof.
 assert.deepEqual(r.intervals,[Math.fround(.035),Math.fround(24.283)]);
 assert.equal(r.visualDifferences.length,156);
 assert.deepEqual(r.visualDifferences.reduce((counts,d)=>{const key=d.frame+':'+d.stage;counts[key]=(counts[key]||0)+1;return counts;},{}),{'1:entry':40,'1:ai-controller':40,'1:steering':40,'1:frame-tail':36});
 assert.ok(r.visualDifferences.every(d=>d.name.startsWith('frame-rider-visual-')&&d.offset>=0xc4&&d.offset<=0x104));
});

test('consecutive AI comparison rejects second-frame body and RNG corruption without reseeding',()=>{
 for(const kind of ['body','random']){
  const i=input(fixture('ai-frame-sequence')),row=i.rows.filter(r=>r.phase==='after-update')[1];
  if(kind==='body'){const b=Buffer.from(row.stateHex,'hex');b[0x510]^=1;row.stateHex=b.toString('hex');}else row.randomState^=1;
  assert.throws(()=>analyzeAiFrameSequence(i,i.rows),kind==='body'?/frame 1 frame-tail body 510/:/frame 1 frame-tail RNG/);
 }
});
