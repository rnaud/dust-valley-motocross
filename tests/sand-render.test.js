import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SandSurface} from '../src/sand-surface.js';

test('sand rendering replaces equal-revision tiles on world reset and preserves collision triangles',()=>{
 const texture=new THREE.Texture(),textures={macro:texture,freeMacro:texture,detail:texture,soilRelief:{normal:texture,roughness:texture}};
 const scene=new THREE.Scene(),coarse={userData:{sandBounds:{value:new THREE.Vector4()}}};
 const surface=new SandSurface(scene,textures,coarse);
 const world=y=>({displacementAt:()=>0,compaction:()=>0,height:(x,z)=>y+x*8-z*4,bounds:{minX:0,maxX:.25,minZ:0,maxZ:.25},tiles:new Map([['0,0',{x:0,z:.25,revision:1,data:[[y,y+1],[y+2,y+3]]}]])});
 surface.update(world(0));const first=surface.meshes.get('0,0');
 assert.deepEqual([...first.geometry.index.array].slice(0,6),[0,1,2,1,3,2]);
 assert.equal(first.geometry.attributes.position.getY(3),3);
 surface.update(world(10));const second=surface.meshes.get('0,0');
 assert.notEqual(first,second);assert.equal(second.geometry.attributes.position.getY(3),13);
 assert.equal(scene.children.length,1);
 surface.update(null);assert.equal(scene.children.length,0);assert.equal(surface.meshes.size,0);
 assert.deepEqual(coarse.userData.sandBounds.value.toArray(),[0,0,0,0]);
});

test('deformed collision vertices also update the rendered surface and disturbed-sand color',async()=>{
 const {SandSurface:Soil}=await import('../src/sand-physics.js');
 const {World}=await import('cannon-es');
 const texture=new THREE.Texture(),textures={macro:texture,freeMacro:texture,detail:texture,soilRelief:{normal:texture,roughness:texture}};
 const surface=new SandSurface(new THREE.Scene(),textures,{userData:{sandBounds:{value:new THREE.Vector4()}}});
 const soil=new Soil(()=>0);soil.follow(0,0,new World());surface.update(soil);
 const geo=surface.meshes.get('0,0').geometry,index=64*65;
 assert.equal(geo.attributes.position.getY(index),0);assert.equal(geo.attributes.color.getX(index),1);
 for(let i=0;i<12;i++)soil.deform([{x:0,z:0,load:1000,demand:1},null],1/120);
 surface.update(soil);
 assert.equal(geo.attributes.position.getY(index),Math.fround(soil.height(0,0)));
 assert.ok(geo.attributes.position.getY(index)<-.03);assert.ok(geo.attributes.color.getX(index)<.8);
});
