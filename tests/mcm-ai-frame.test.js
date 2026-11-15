import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {advanceMcmRetainedFrame} from '../src/physics/mcm/retained-frame.js';
import {createMcmRandom} from '../src/physics/mcm/random.js';
import {checkpointMemory} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {bitsFloat} from '../src/physics/mcm/math.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-frame-wine11.json.br',import.meta.url))));
function input(f=fixture()){
 const json=name=>JSON.parse(f.files[name+'.json']),rows=f.files['frames.jsonl'].trim().split('\n').map(JSON.parse);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map(),node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {checkpoint:json('checkpoint'),animations:json('animations'),environment:json('environment'),collision:json('collision'),row:rows.find(r=>r.phase==='before-update'),terrain:{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale},throttle:0,brake:0,rows};
}
test('natural AI frame evidence retains pinned provenance, initial body and chronological random state',()=>{
 const f=fixture(),i=input(f),m=checkpointMemory(i.checkpoint);assert.equal(f.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,4);
 assert.equal(m.u32(i.checkpoint.bikeAddress+0x614),1);assert.equal(i.row.stateHex,m.read(i.checkpoint.bikeAddress,0xcc8).toString('hex'));
 const random=createMcmRandom(i.rows[0].state);let frames=0,draws=0;
 for(const row of i.rows){if(row.phase==='random'){assert.equal(row.state,random.state);random.draw();draws++;}else{assert.equal(row.scripted,false);assert.equal(row.randomState,random.state);assert.equal(row.sequence,frames++);}}
 assert.equal(frames,4);assert.equal(draws,4);
 // Preserve the large natural elapsed interval caused by stopped capture work.
 assert.ok(bitsFloat(i.rows.find(r=>r.sequence===2).frameBits)>1);
});
test('AI frame bootstrap shares actor transforms, animation resources and live state',()=>{
 const i=input(),loaded=loadLiveFrameBootstrap(i),c=loaded.context,a=i.checkpoint.bikeAddress,m=checkpointMemory(i.checkpoint);
 assert.equal(c.bike.field614,1);assert.equal(c.engineEntry.input.ai,1);assert.equal(loaded.random.state,i.row.randomState);
 assert.equal(loaded.ordered.actors.get(a).transform,c.bodyNode);assert.equal(loaded.ordered.actors.get(a).position,c.bike.position);
 assert.equal(c.frameRider.bikeAnimation,loaded.animation.context.bikeAnimation);assert.equal(c.frameRider.riderAnimation,loaded.animation.context.riderAnimation);
 assert.equal(loaded.animation.assets.records.length,69);assert.equal(loaded.animation.assets.frames.size,2313);
 for(const [kind,base] of [[0,0x7d4],[1,0x794]])for(let j=0;j<16;j++){const record=c.frameRider.tricks[kind][j];assert.equal(record.token,m.u32(a+base+j*4));assert.equal(record,loaded.animation.assets.records.find(r=>r.token===record.token));}
 assert.equal(c.loopRider.bikeRecords[7],c.frameRider.tricks[0][7].firstFrame.token);
 const randomBefore=loaded.random.state;
 assert.deepEqual(advanceMcmRetainedFrame(c,{delta:bitsFloat(i.row.frameBits),mode:loaded.mode,input:loaded.input}),{status:'pending-controller',controller:'ai',substeps:0});assert.equal(loaded.random.state,randomBefore);
});
test('AI bootstrap rejects mixed boundaries, player relabeling and missing trick resources',()=>{
 const mixed=input();mixed.animations.captureBoundary='player-frame-entry';assert.throws(()=>loadLiveFrameBootstrap(mixed),/boundary differs/);
 const player=input(),body=player.checkpoint.blocks.find(b=>b.address===player.checkpoint.bikeAddress),bytes=Buffer.from(body.hex,'hex');bytes.writeUInt32LE(0,0x614);body.hex=bytes.toString('hex');assert.throws(()=>loadLiveFrameBootstrap(player),/requires an AI bike/);
 const missing=input(),memory=checkpointMemory(missing.checkpoint),record=memory.u32(missing.checkpoint.bikeAddress+0x7d4);missing.animations.blocks=missing.animations.blocks.filter(b=>b.address!==record);missing.animations.blockCount--;assert.throws(()=>loadLiveFrameBootstrap(missing),/animation block|Missing checkpoint memory/);
});
