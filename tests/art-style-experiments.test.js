import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import {uniform} from 'three/tsl';
import {prepareRetroMaterials,restoreRetroMaterials} from '../src/art-style-experiments.js';

test('PS1 swaps meshes to snapped node materials and restores the originals',()=>{
 const scene=new THREE.Scene(),standard=new THREE.MeshStandardMaterial({map:new THREE.DataTexture(new Uint8Array(4),1,1)}),node=new THREE.MeshStandardNodeMaterial();
 const a=new THREE.Mesh(new THREE.BoxGeometry(),standard),b=new THREE.Mesh(new THREE.BoxGeometry(),node),c=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial());
 scene.add(a,b,c);node.colorNode=uniform(new THREE.Color('red'));
 const renderer={library:new THREE.WebGPURenderer({canvas:{getContext:()=>null,addEventListener(){},style:{}}}).library};
 const prepared=new Map(),grid=uniform(new THREE.Vector2(160,120));
 for(let cycle=0;cycle<2;cycle++){
  prepareRetroMaterials(scene,renderer,grid,prepared);prepareRetroMaterials(scene,renderer,grid,prepared);
  assert.equal(prepared.size,2,'one cached clone per material');
  assert.ok(a.material.isNodeMaterial&&a.material.vertexNode&&a.material!==standard);
  assert.ok(b.material.vertexNode&&b.material.colorNode===node.colorNode,'existing node graphs survive');
  assert.equal(c.material.isPointsMaterial,true,'non-mesh objects are untouched');
  restoreRetroMaterials(prepared);assert.equal(a.material,standard);assert.equal(b.material,node);assert.equal(prepared.size,0);
  assert.equal(a.userData.retroOriginal,undefined);
 }
});
