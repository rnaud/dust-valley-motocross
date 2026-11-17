import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {McmParticles} from '../src/mcm-particles.js';
test('particle presentation sorts its own copy, preserves native bytes and clears on backend switch',()=>{
 const slots=Array.from({length:4},()=>new DataView(new ArrayBuffer(0x48)));
 for(const [i,p]of slots.entries()){
  for(const [offset,value]of [[8,-i-1],[0x14,20],[0x18,100],[0x1c,2]])p.setFloat32(offset,value,true);
  p.setUint32(0xc,0xffaa55,true);p.setUint32(0x34,2,true);
 }
 slots[2].setFloat32(0x14,101,true); // expired
 slots[3].setFloat32(0x1c,NaN,true); // invalid size
 const before=slots.map(p=>Buffer.from(p.buffer).toString('hex'));
 const state={physicsBackend:'recovered-core',physics:{shared:{particles:{pool:{count:4,particle:i=>slots[i]}}},position:p=>new THREE.Vector3(...p)}};
 const view=new McmParticles(),camera=new THREE.PerspectiveCamera();view.update(state,camera);
 assert.equal(view.count,2);assert.equal(view.nativeCount,4);
 assert.equal(view.centers[2],-2);assert.equal(view.centers[5],-1);
 assert.ok(Math.abs(view.colors[3]-204/255)<1e-6);
 assert.deepEqual(slots.map(p=>Buffer.from(p.buffer).toString('hex')),before);
 state.physicsBackend='legacy';view.update(state,camera);assert.equal(view.root.geometry.instanceCount,0);
 state.physicsBackend='recovered-core';state.physics.shared.particles.pool.count=0;view.update(state,camera);assert.equal(view.count,0);
});
