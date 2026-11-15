import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {readMcmResources,readMcmSlt} from '../scripts/mcm-reference/render-assets.mjs';
import {createMcmCoreState,stepMcmCoreState} from '../src/mcm-core-preview.js';
import {createMcmOriginalModels,bindMcmModelNodes} from '../src/mcm-original-models.js';
const read=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/'+name,import.meta.url))));
const assets=read('mcm-original-models.bin'),base=read('mcm-core-scene.bin');
test('original meshes bind every articulated part without mutating physics transforms',()=>{
 const s=createMcmCoreState(base,{sand:false}),v=s.physics.runtime.loaded.visuals;
 assert.equal(bindMcmModelNodes(assets.models.bike,v.bike).size,7);assert.equal(bindMcmModelNodes(assets.models.rider,v.rider).size,15);
 const snapshot=()=>JSON.stringify([...v.nodes.values()].map(n=>[n.local,n.world,n.cacheValid]));const before=snapshot(),model=createMcmOriginalModels(assets);model.update(s,'rider12');assert.equal(snapshot(),before);assert.equal(model.parts,21);assert.equal(assets.variants.length,12);assert.equal(Object.keys(assets.textures).length,24);
 for(const part of model.root.children)assert.ok(part.matrix.elements.every(Number.isFinite));
});
test('original resource decoder rejects truncated directories and overlapping header data',()=>{
 assert.throws(()=>readMcmResources(Buffer.from('bad!')),/Expected/);
 const data=Buffer.alloc(48);data.write('RES');data.writeUInt32LE(1,4);data.write('name',8);data.writeUInt32LE(8,40);assert.throws(()=>readMcmResources(data),/Invalid resource entry/);
 assert.throws(()=>readMcmSlt('[Materials]\nend'),/Empty SLT/);
});
test('selected course uses native reset alignment and its own shadow environment',()=>{
 for(const id of ['canyon-canyon01','season-week10']){const a=read(`mcm-maps/${id}.bin`),s=createMcmCoreState({...base,mapId:id,terrainMode:a.terrainMode,shadowTarget:a.shadowTarget,terrain:a.terrain},{sand:false}),c=s.physics.runtime.loaded.context;
 assert.ok(c.bike.position[0]<1000);assert.equal(c.contactPhase.normalEventDecision.terrainMode,1);assert.equal(c.frameEffects.occlusion,!!a.shadowTarget);
 for(let i=0;i<30;i++)stepMcmCoreState(s,{gas:true},.02);assert.ok(s.speed>0);assert.equal(s.frame,30);assert.ok([s.x,s.y,s.z].every(Number.isFinite));
 }
});
