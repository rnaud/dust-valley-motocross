import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VoxelTerrain} from '../src/voxel-terrain.js';
test('voxel shell samples the supplied terrain and stays on a world-aligned grid',()=>{
 const terrain=new VoxelTerrain();let samples=0;const height=(x,z)=>{samples++;return x*.03+z*.01;};
 terrain.update(0,0,height);assert.ok(samples>96*96);
 const first=new THREE.Matrix4();terrain.root.getMatrixAt(0,first);
 assert.equal(first.elements[0],2);assert.equal(first.elements[10],2);
 const top=first.elements[13]+16;assert.ok(top>=height(first.elements[12],first.elements[14]));
 const before=samples;terrain.update(.5,.5,height);assert.equal(samples,before);
 terrain.update(32,0,height);const shifted=new THREE.Matrix4();terrain.root.getMatrixAt(0,shifted);
 assert.equal(shifted.elements[12]-first.elements[12],32);
});
