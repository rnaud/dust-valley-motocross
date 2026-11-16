import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{brotliDecompressSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{analyzeWorldBikes}from'../scripts/mcm-reference/analyze-world-bikes.mjs';
import{connectWorldSceneQueue}from'../scripts/mcm-reference/world-scene-queue.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-scene-queue-wine11.json.br',import.meta.url))));
test('scene queue joins both bikes, player camera and shared particles without output reseeding',()=>{
 const files=fixture.files;for(const[name,value]of Object.entries(files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const{terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 const r=analyzeWorldBikes(files,{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid},{renderCameraInputs:true,particleIntegration:true,markerIntegration:true,hudIntegration:true,sceneChildIntegration:true,chaseIntegration:true,sceneQueueIntegration:true});
 assert.equal(r.sceneQueueTicks,64);assert.equal(r.sceneQueueReports.length,260);
 for(const[name,count]of[['entryReports',130],['reports',130],['riderReports',64],['collisionReports',129],['visualReports',129],['markerReports',260],['hudReports',260],['sceneQueueReports',260]]){
  assert.equal(r[name].length,count);for(const x of r[name]){assert.deepEqual(x.differences,[]);if(x.random)assert.equal(x.random.actual,x.random.expected);}
 }
 assert.equal(r.worldRiderReports.length,256);for(const x of r.worldRiderReports){assert.deepEqual(x.rider.differences,[]);assert.deepEqual(x.collision.differences,[]);}
 assert.equal(r.particleReports.length,576);assert.ok(r.particleReports.every(x=>x.differences===0));
 assert.equal(r.chaseReport.frames,64);assert.equal(r.chaseReport.intermediateEvolutionInputs,0);
 assert.equal(r.sceneChildReports.length,64);for(const x of r.sceneChildReports)assert.deepEqual(x.externalActors.map(a=>a.update),[0x43e660,0x411000,0x423b50]);
 assert.ok(r.sceneQueueReports.every(x=>x.items===0),'This live fixture proves empty queue scheduling only');
 assert.equal((files['cleanup.log'].match(/restored=1/g)||[]).length,49);assert.match(files['cleanup.log'],/debugger=0 clean=1/);
});
test('queue adapter requires initialization, detects changed outputs and refuses unconnected frees',()=>{
 const address=4096,stateBytes=Buffer.alloc(0x58),actor={address,update:0x4253e0,stateBytes,queueItems:[]},runtime={world:{tree:{nodes:new Map([[address,actor]])}}};
 let q=connectWorldSceneQueue(runtime);const row={address,hex:stateBytes.toString('hex'),queueItems:[]};
 assert.equal(q.compare(row).differences.length,0);const changed=Buffer.from(stateBytes);changed.writeUInt32LE(1,0x50);assert.equal(q.compare({...row,hex:changed.toString('hex')}).differences.length,1);
 delete actor.queueItems;assert.throws(()=>connectWorldSceneQueue(runtime),/Missing scene queue items/);
 const item=Buffer.alloc(0x8c);item.writeFloatLE(2,0x84);stateBytes.writeUInt32LE(8192,0x54);actor.queueItems=[{address:8192,hex:item.toString('hex')}];q=connectWorldSceneQueue(runtime);
 assert.throws(()=>q.step(.1,()=>{}),/Unconnected scene queue free/);assert.equal(stateBytes.readUInt32LE(0x54),8192);
});
