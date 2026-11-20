import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {createMcmTerrainTextures,createMcmTerrainMaterial} from '../src/mcm-terrain-material.js';
test('all imported maps preserve palette pixels and leaf texture assignments in GPU resources',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../docs/mcm-map-assets.json',import.meta.url)));let count=0;
 for(const map of catalog){
  const scene=JSON.parse(gunzipSync(fs.readFileSync(new URL(`../src/assets/mcm-maps/${map.id}.bin`,import.meta.url))));
  const r=createMcmTerrainTextures(scene),palette=Buffer.from(scene.rendering.palette,'base64');
  scene.rendering.textures.forEach((texture,index)=>{
   const mip=Buffer.from(texture.mip,'base64'),level=r.atlas.mipmaps[1],mipAt=(Math.floor(index/r.columns)*r.size/2*level.width+index%r.columns*r.size/2)*4;
   assert.deepEqual([...level.data.subarray(mipAt,mipAt+3)],[...palette.subarray(mip[0]*3,mip[0]*3+3)],map.id+' mip');
   const indices=Buffer.from(texture.pixels,'base64');
   for(const p of [0,17,Math.floor(indices.length/2),indices.length-1]){
    const x=p%r.size,y=Math.floor(p/r.size),at=((Math.floor(index/r.columns)*r.size+y)*r.atlas.image.width+index%r.columns*r.size+x)*4;
    assert.deepEqual([...r.atlas.image.data.subarray(at,at+3)],[...palette.subarray(indices[p]*3,indices[p]*3+3)],map.id);
   }
  });
  const data=r.lookup.image.data;let leafCount=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]){leafCount++;assert.ok(data[i]>=0&&data[i]<scene.rendering.textures.length,map.id);assert.ok(data[i+2]>=0&&data[i+2]<=7);}
  assert.equal(leafCount,Object.values(scene.terrain.nodes).filter(n=>n.level===0).length,map.id);
  assert.equal(r.missing,0,map.id);count+=scene.rendering.textures.length;r.dispose();
 }
 assert.equal(count,1068);
});

test('preview terrain textures are a TSL colour node, not a WebGL shader patch',()=>{
 // The renderer is a WebGPURenderer, which never invokes onBeforeCompile. Expressing
 // the original atlas as a colour node is what keeps the preview terrain textured.
 const scene=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url))));
 const resources=createMcmTerrainTextures(scene),state={physics:{nativePoint:(x,z)=>new THREE.Vector3(x,0,z),terrain:{worldToGrid:1},scene:{terrainMode:0}}};
 const coarse=createMcmTerrainMaterial(resources,state),dense=createMcmTerrainMaterial(resources,state,{dense:true,bounds:new THREE.Vector4(0,48,0,48)});
 for(const material of [coarse,dense]){
  assert.equal(material.isNodeMaterial,true);
  assert.ok(material.colorNode);
  assert.equal(material.onBeforeCompile,THREE.Material.prototype.onBeforeCompile,material.name);
 }
 assert.equal(coarse.side,THREE.FrontSide);assert.equal(coarse.polygonOffset,false);
 assert.equal(dense.side,THREE.DoubleSide);assert.equal(dense.polygonOffset,true);
 resources.dispose();
});
