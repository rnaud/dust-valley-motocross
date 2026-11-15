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

test('Widowmaker uses the declared scene start instead of the empty hierarchy center',()=>{
 const id='quarries-track13',a=read(`mcm-maps/${id}.bin`),settings=JSON.parse(fs.readFileSync(new URL('../src/mcm-scene-settings.json',import.meta.url)))[id];
 const s=createMcmCoreState({...base,mapId:id,terrainMode:a.terrainMode,shadowTarget:a.shadowTarget,terrain:a.terrain,sceneSettings:settings},{sand:false});
 const point=s.physics.nativePoint(0,0);
 // Recovered ground alignment can shift the final horizontal position slightly.
 assert.ok(Math.abs(point.x-1113)<1);assert.ok(Math.abs(point.z-1197)<1);
 for(let i=0;i<30;i++)stepMcmCoreState(s,{gas:true},.02);
 assert.ok([s.x,s.y,s.z,s.speed].every(Number.isFinite));assert.ok(s.speed>0);
});

test('original rider and bike interpolate between fixed ticks without touching native state',()=>{
 const s=createMcmCoreState(base,{sand:false}),model=createMcmOriginalModels(assets);model.reset(s);
 const matrices=()=>model.root.children.map(p=>[...p.matrix.elements]);
 model.update(s);const start=matrices();
 stepMcmCoreState(s,{gas:true},.02);model.push(s);model.update(s);const end=matrices();
 const native=()=>JSON.stringify([...s.physics.runtime.loaded.visuals.nodes.values()].map(n=>[n.local,n.world,n.cacheValid]));const before=native();
 let movingRider=false,movingBike=false;
 for(const alpha of [0,.25,.5,.75,1]){
  model.update(s,'rider01','bike01',alpha);
  for(const [i,part]of model.root.children.entries())for(const at of [12,13,14]){
   assert.ok(Math.abs(part.matrix.elements[at]-(start[i][at]+(end[i][at]-start[i][at])*alpha))<1e-9);
   if(Math.abs(end[i][at]-start[i][at])>1e-7){if(part.name.startsWith('mcm-rider-'))movingRider=true;else movingBike=true;}
  }
 }
 assert.ok(movingRider&&movingBike);assert.equal(native(),before);
 // Multiple simulation steps in one render must interpolate the latest pair.
 const prior=end;stepMcmCoreState(s,{gas:true},.02);model.push(s);model.update(s,'rider01','bike01',0);assert.deepEqual(matrices(),prior);
 model.reset(s);model.update(s,'rider01','bike01',0);const reset=matrices();model.update(s,'rider01','bike01',1);assert.deepEqual(matrices(),reset);
});
