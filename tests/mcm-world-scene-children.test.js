import test from 'node:test';
import assert from 'node:assert/strict';
import {connectWorldSceneChildren} from '../scripts/mcm-reference/world-scene-children.mjs';
function setup(){
 const scene={address:1,update:0x481310},camera={address:2,update:0x47b0c0,enabled:1,parent:scene},world={address:3,update:0x4590b0,enabled:1,parent:scene},poolActor={address:4,update:0x43b200,enabled:1,parent:scene};
 scene.first=camera;camera.next=world;world.next=poolActor;
 const particle=new DataView(new ArrayBuffer(72));particle.setFloat32(0x18,2000,true);
 const runtime={world:{entry:{actor:3},tree:{nodes:new Map([scene,camera,world,poolActor].map(n=>[n.address,n]))},context:{world:{paused:0}}},particles:{address:4,pool:{count:1,particle:()=>particle}}};
 return {runtime,scene,camera,world,poolActor,particle};
}
test('scene child links schedule pool aging after the world and preserve live link order',()=>{
 const c=setup(),run=connectWorldSceneChildren(c.runtime),events=[];
 const services={actor:node=>events.push(node.address),world:()=>{events.push(3);c.particle.setFloat32(0x14,10,true);},beforePool:()=>events.push('before-pool'),afterPool:()=>events.push('after-pool')};
 assert.deepEqual(run(1,services).map(n=>n.address),[2,3,4]);
 assert.deepEqual(events,[2,3,'before-pool','after-pool']);assert.equal(c.particle.getFloat32(0x14,true),1010);
 c.camera.next=c.poolActor;c.poolActor.next=c.world;c.world.next=null;events.length=0;
 assert.deepEqual(run(.1,services).map(n=>n.address),[2,4,3]);assert.equal(c.particle.getFloat32(0x14,true),10);
 c.poolActor.paused=1;events.length=0;run(.1,services);assert.deepEqual(events,[2,3]);
});
test('scene scheduling rejects missing topology, services and active polling dependencies',()=>{
 const c=setup();c.poolActor.parent=null;assert.throws(()=>connectWorldSceneChildren(c.runtime),/topology/);
 c.poolActor.parent=c.scene;const run=connectWorldSceneChildren(c.runtime);
 assert.throws(()=>run(.1,{}),/Unconnected scene service: actor/);
 c.camera.enabled=0;c.world.ownerAddress=99;assert.throws(()=>connectWorldSceneChildren(c.runtime),/owners/);
 c.world.ownerAddress=0;c.scene.owner={world:{gate:1}};
 assert.throws(()=>run(.1,{world:()=>{}}),/polling/);
});
test('429d90 scene actor executes its child walk instead of deferring the subtree',()=>{
 const c=setup(),wrapper={address:5,update:0x429d90,enabled:1,parent:c.scene},child={address:6,update:0x123456,enabled:1};
 c.poolActor.next=wrapper;wrapper.first=child;child.parent=wrapper;
 c.runtime.world.tree.nodes.set(5,wrapper);c.runtime.world.tree.nodes.set(6,child);
 const deferred=[],run=connectWorldSceneChildren(c.runtime);
 const trace=run(.25,{world:()=>1,beforePool:()=>{},afterPool:()=>{},actor:(node,dt)=>deferred.push([node.address,dt])});
 assert.deepEqual(trace.map(n=>n.address),[2,3,4,5,6]);assert.deepEqual(deferred,[[2,.25],[6,.25]]);
});
