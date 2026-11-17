import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareRetroMaterials,restoreRetroMaterials,createAsciiAtlas} from '../src/art-style-experiments.js';
test('PS1 chains existing terrain hooks and restores original callbacks and cache identity',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));let calls=0;
 const original=shader=>{calls++;shader.uniforms.terrain={value:1};},key=()=> 'original-terrain';material.onBeforeCompile=original;material.customProgramCacheKey=key;
 const prepared=new Set(),enabled={value:1},grid={value:new THREE.Vector2(160,120)};
 for(let cycle=0;cycle<2;cycle++){
  prepareRetroMaterials(scene,enabled,grid,prepared);prepareRetroMaterials(scene,enabled,grid,prepared);assert.equal(prepared.size,1);
  const shader={uniforms:{},vertexShader:'void main(){gl_Position=vec4(1.);}',fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.terrain.value,1);assert.equal(shader.uniforms.retroEnabled,enabled);assert.match(shader.fragmentShader,/vMapUv \/ retroW/);
  restoreRetroMaterials(prepared);assert.equal(material.onBeforeCompile,original);assert.equal(material.customProgramCacheKey,key);assert.equal(prepared.size,0);
 }assert.equal(calls,2);
});
test('ASCII atlas has transparent spacing and eight distinct glyphs',()=>{
 const texture=createAsciiAtlas(),{data,width,height}=texture.image;assert.equal(width,64);assert.equal(height,8);const glyphs=[];
 for(let g=0;g<8;g++){const bits=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits.push(data[(y*64+g*8+x)*4+3]);glyphs.push(bits.join(','));}assert.equal(new Set(glyphs).size,8);texture.dispose();
});
