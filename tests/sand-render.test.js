import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SandSurface} from '../src/sand-surface.js';

test('sand rendering replaces equal-revision tiles on world reset and preserves collision triangles',()=>{
 const texture=new THREE.Texture(),textures={macro:texture,freeMacro:texture,detail:texture,soilRelief:{normal:texture,roughness:texture}};
 const scene=new THREE.Scene(),coarse={userData:{sandBounds:{value:new THREE.Vector4()}}};
 const surface=new SandSurface(scene,textures,coarse);
 const world=y=>({height:(x,z)=>y+x*8-z*4,bounds:{minX:0,maxX:.25,minZ:0,maxZ:.25},tiles:new Map([['0,0',{x:0,z:.25,revision:1,data:[[y,y+1],[y+2,y+3]]}]])});
 surface.update(world(0));const first=surface.meshes.get('0,0');
 assert.deepEqual([...first.geometry.index.array].slice(0,6),[0,1,2,1,3,2]);
 assert.equal(first.geometry.attributes.position.getY(3),3);
 surface.update(world(10));const second=surface.meshes.get('0,0');
 assert.notEqual(first,second);assert.equal(second.geometry.attributes.position.getY(3),13);
 assert.equal(scene.children.length,1);
 surface.update(null);assert.equal(scene.children.length,0);assert.equal(surface.meshes.size,0);
 assert.deepEqual(coarse.userData.sandBounds.value.toArray(),[0,0,0,0]);
});
