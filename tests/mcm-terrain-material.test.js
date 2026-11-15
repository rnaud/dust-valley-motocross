import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {createMcmTerrainTextures} from '../src/mcm-terrain-material.js';
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
