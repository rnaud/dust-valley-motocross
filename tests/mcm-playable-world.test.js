import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createMcmCoreState,stepMcmCoreState} from '../src/mcm-core-preview.js';
import {runWorldStability} from '../scripts/mcm-reference/run-world-stability.mjs';
const read=name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/'+name,import.meta.url))));
const scene={...read('mcm-core-scene.bin'),mapId:'quarries-dunes',terrain:read('mcm-maps/quarries-dunes.bin').terrain,worldFiles:read('mcm-world-scene.bin').files};
test('playable controls and display reads preserve both continuous bike bodies for 1500 updates',async()=>{
 const expected=await runWorldStability({files:scene.worldFiles,t:scene.terrain,frames:1500},new URL('../',import.meta.url).href);
 const state=createMcmCoreState(scene,{sand:false}),checkpoints=[];
 assert.equal(state.opponents.length,1);
 assert.equal(state.physics.runtime.loaded.random,state.opponents[0].physics.runtime.loaded.random);
 for(let frame=0;frame<1500;frame++){
  const phase=frame%500;
  stepMcmCoreState(state,{gas:phase<350,brake:phase>=450,steer:phase>=100&&phase<220?-.2:phase>=250&&phase<350?.2:0},Math.fround(.02));
  assert.equal(state.frame,state.opponents[0].frame);
  if(frame%100===0||frame===1499)checkpoints.push({frame,random:state.physics.shared.random.state,bikes:[...state.physics.shared.bikes].map(([address,b])=>{const view=b.projection.projectBody();return{address,body:Array.from({length:view.byteLength/4},(_,i)=>view.getUint32(i*4,true))};})});
 }
 assert.deepEqual(checkpoints,expected.checkpoints);
 assert.equal(state.physics.simulation.terrainNodes.ticks,1499);
 const reset=createMcmCoreState(scene,{sand:false});assert.equal(reset.frame,0);assert.equal(reset.opponents[0].frame,0);
 assert.notEqual(reset.physics.shared,state.physics.shared);
 assert.deepEqual(reset.physics.runtime.loaded.context.bike.position,createMcmCoreState(scene,{sand:false}).physics.runtime.loaded.context.bike.position);
});
test('shared world sand affects both bikes and rejects replacement terrain',()=>{
 const state=createMcmCoreState(scene,{sand:true});
 assert.equal(state.physics.sand,state.opponents[0].physics.sand);
 for(let i=0;i<100;i++)stepMcmCoreState(state,{gas:true},Math.fround(.02));
 assert.ok(state.physics.sand.version>0);assert.ok(state.opponents[0].speed>1);
 assert.throws(()=>createMcmCoreState({...scene,mapId:'season-week01'}),/original terrain/);
});
