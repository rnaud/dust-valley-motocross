import test from 'node:test';
import assert from 'node:assert/strict';
import {Heightfield} from 'cannon-es';
import {PlaneGeometry,Vector3} from 'three';
import {sampleGrid,terrainIndices} from '../src/height-grid.js';
import {createState,stepBike,freeTerrain} from '../src/world.js';

test('rendered triangles and terrain sampling match Cannon on both sides of every diagonal',()=>{
 const size=8,spacing=3,half=size*spacing/2,heights=[];
 const height=(x,z)=>Math.sin(x*.4)*Math.cos(z*.3)*5;
 const data=Array.from({length:size+1},(_,x)=>Array.from({length:size+1},(_,y)=>height(x*spacing-half,half-y*spacing)));
 const collider=new Heightfield(data,{elementSize:spacing});
 const mesh=new PlaneGeometry(size*spacing,size*spacing,size,size);mesh.rotateX(-Math.PI/2);mesh.setIndex(terrainIndices(size));
 const pos=mesh.attributes.position;
 for(let i=0;i<pos.count;i++){heights[i]=height(pos.getX(i),pos.getZ(i));pos.setY(i,heights[i]);}
 for(let i=0;i<mesh.index.count;i+=3){
  const a=new Vector3().fromBufferAttribute(pos,mesh.index.getX(i)),b=new Vector3().fromBufferAttribute(pos,mesh.index.getX(i+1)),c=new Vector3().fromBufferAttribute(pos,mesh.index.getX(i+2));
  for(const [u,v] of [[.2,.3],[.65,.15]]){
   const p=a.clone().multiplyScalar(1-u-v).addScaledVector(b,u).addScaledVector(c,v);
   const physical=collider.getHeightAt(p.x+half,half-p.z,true);
   assert.ok(Math.abs(p.y-physical)<1e-6);
   assert.ok(Math.abs(sampleGrid(i=>heights[i],p.x,p.z,size,spacing)-physical)<1e-6);
  }
 }
});

test('suspension probes its full extension and remains unloaded without ground',()=>{
 const s=createState({flat:true,height:()=>0}),{chassis,vehicle}=s.physics,wheel=vehicle.wheelInfos[0];
 chassis.position.set(0,1.43,0); // Contact needs 0.70 m extension, beyond 0.55 m rest.
 vehicle.castRay(wheel);assert.equal(wheel.isInContact,true);assert.ok(Math.abs(wheel.suspensionLength-.7)<1e-6);
 chassis.position.y=3;vehicle.castRay(wheel);assert.equal(wheel.isInContact,false);assert.ok(Math.abs(wheel.suspensionLength-.85)<1e-12);
});

test('steering across a flat heightfield seam does not drop a tire contact',()=>{
 for(const direction of [-1,1]){
  const s=createState({flat:true,height:()=>0});
  for(let i=0;i<120;i++)stepBike(s,{},1/120);
  s.physics.chassis.velocity.z=15;
  for(let i=0;i<120;i++){stepBike(s,{gas:true,steer:direction*.5},1/120);assert.equal(s.contacts,2,`false contact loss at step ${i}`);}
 }
});

test('free ride starter line delivers three jumps and rideable landings in ten seconds',()=>{
 const s=createState({height:freeTerrain,spawn:{x:0,z:0,yaw:0}});let landings=0;
 for(let i=0;i<1200;i++){
  const result=stepBike(s,{gas:true},1/120);assert.equal(s.crashed,false);
  if(result.landed>.5){landings++;assert.ok(s.speed>15);}
 }
 assert.equal(landings,3);assert.ok(s.z>175);
});
