import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {createMcmCoreState,stepMcmCoreState} from '../src/mcm-core-preview.js';
import {floatBits,bitsFloat} from '../src/physics/mcm/math.js';
import {queryMcmTerrainHeight} from '../src/physics/mcm/terrain-height.js';
const scene=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-core-scene.bin',import.meta.url))));
test('playable recovered hardpack backend preserves original steering trajectory for 400 frames',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-retained-steering-wine11.json.br',import.meta.url))));
 const state=createMcmCoreState(scene,{sand:false});
 assert.equal(state.physicsBackend,'recovered-core');
 assert.equal(state.physics.world,undefined);
 for(let i=0;i<400;i++){
  const row=f.rows[i*2],after=Buffer.from(f.rows[i*2+1].stateHex,'hex');
  let bikeAtReturn;
  stepMcmCoreState(state,{gas:!!row.requestedThrottle,steer:-bitsFloat(row.requestedSteerBits)},bitsFloat(row.frameBits),{observe(stage,c){if(stage==='return')bikeAtReturn=Object.fromEntries(Object.entries(c.bike).map(([k,v])=>[k,Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v):v]));},worldEvents:f.events.filter(e=>e.frame===i&&['before-rider','before-pool'].includes(e.phase)).map(e=>({kind:e.phase.slice(7),delta:bitsFloat(e.dtBits),paused:e.paused}))});
  const b=bikeAtReturn;
  for(const [key,offset] of Object.entries({position:0x4f8,velocity:0x510,forward:0x4c0,up:0x4cc,angularVelocity:0x534,worldAngularVelocity:0x528,acceleration:0x51c}))Array.from(b[key]).forEach((v,j)=>assert.equal(floatBits(v),after.readUInt32LE(offset+j*4),`frame ${i} ${key}[${j}]`));
  assert.ok(Number.isFinite(state.x+state.y+state.z+state.speed));
 }
});
test('sand deformation reaches recovered terrain samples and a new ride resets independently',()=>{
 const state=createMcmCoreState(scene,{sand:true}),{sand,terrain,nativePoint}=state.physics;
 const p=nativePoint(0,0),gx=Math.round(p.x*terrain.worldToGrid),gz=Math.round(p.z*terrain.worldToGrid);
 const native=[gx/terrain.worldToGrid,0,gz/terrain.worldToGrid],display=state.physics.position(native);
 const before=queryMcmTerrainHeight({...terrain,point:native})[1];
 sand.follow(display.x,display.z,state.physics.tileWorld);
 for(let i=0;i<10;i++)sand.deform([{x:display.x,z:display.z,load:1800,demand:1},null],.02);
 const after=queryMcmTerrainHeight({...terrain,point:native})[1];
 assert.ok(after<before-.05,'The native contact surface must deform, not only the display mesh');
 const fresh=createMcmCoreState(scene,{sand:false});
 assert.equal(queryMcmTerrainHeight({...fresh.physics.terrain,point:native})[1],before);
 assert.equal(fresh.physics.runtime.loaded.random.state,scene.row.randomState);
});
test('fast display terrain agrees with the native height query across the playable basin',()=>{
 const state=createMcmCoreState(scene,{sand:false});
 for(let i=0;i<2000;i++){
  const x=Math.sin(i*173.24)*440,z=Math.cos(i*357.13)*440,p=state.physics.nativePoint(x,z);
  const height=queryMcmTerrainHeight({...state.physics.terrain,point:[p.x,p.y,p.z]})[1];
  const expected=state.physics.position([p.x,height,p.z]).y;
  assert.ok(Math.abs(expected-state.physics.baseHeight(x,z))<.00001,`sample ${i}`);
 }
});
