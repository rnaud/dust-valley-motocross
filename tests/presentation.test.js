import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3,Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {RidePose,steeringRotation} from '../src/ride-pose.js';
import {batchMeshes} from '../src/mesh-batch.js';
const makeState=(x=0,yaw=0)=>({x,y:.5,z:0,quaternion:new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw),yaw,roll:0,speed:30,steer:0,compression:[.2,.2],wheelTransforms:[-1,1].map(z=>({position:{x,y:.61,z},quaternion:new Quaternion()}))});

test('irregular render timing preserves constant motion and wheel/body alignment',()=>{
 let state=makeState(),pose=new RidePose(state),accumulator=0,simTime=0,time=0,last;
 let rawError=0,interpolatedError=0;
 for(let frame=0;frame<240;frame++){
  const dt=[1/60,1/90,1/144,1/50][frame%4];time+=dt;accumulator+=dt;
  while(accumulator>=1/120){simTime+=1/120;state=makeState(simTime*30);pose.push(state);accumulator-=1/120;}
  const shown=pose.sample(accumulator*120);
  assert.ok(Math.abs(shown.position.x-(time-1/120)*30)<1e-8);
  assert.ok(Math.abs(shown.position.x-shown.wheels[0].position.x)<1e-8);
  if(last){rawError+=(state.x-last.raw-30*dt)**2;interpolatedError+=(shown.position.x-last.shown-30*dt)**2;}
  last={raw:state.x,shown:shown.position.x};
 }
 assert.ok(rawError>.1);assert.ok(interpolatedError<1e-12);
});
test('heading wraps smoothly and recovery does not interpolate across the world',()=>{
 const pose=new RidePose(makeState(0,Math.PI-.01));pose.push(makeState(1,-Math.PI+.01));
 assert.ok(Math.abs(pose.sample(.5).yaw-Math.PI)<1e-8);
 pose.reset(makeState(200));assert.equal(pose.sample(.5).position.x,200);
});
test('a banked visible tire stays on its contact plane',()=>{
 const state=makeState();state.wheelContacts=[{x:0,y:0,z:-1,normal:{x:0,y:1,z:0}},null];
 state.wheelTransforms[0].quaternion.setFromAxisAngle(new Vector3(0,0,1),.9);
 const visible=new RidePose(state).sample(1).wheels[0];
 assert.ok(Math.abs(visible.position.y-(.47*Math.cos(.9)+.14))<1e-8);
});
test('contact correction does not drag the wheel toward the previous step at speed',()=>{
 const state=makeState(10);state.wheelContacts=[{x:9.8,y:0,z:-1.25,normal:{x:0,y:1,z:0}},null];
 state.wheelTransforms[0].direction={x:0,y:-1,z:0};
 state.wheelTransforms[0].quaternion.setFromAxisAngle(new Vector3(0,0,1),.9);
 const shown=new RidePose(state).sample(1).wheels[0];
 assert.equal(shown.position.x,10);assert.equal(shown.position.z,-1);
 assert.ok(Math.abs(shown.position.y-(.47*Math.cos(.9)+.14))<1e-8);
});
test('steering assembly follows the axle through banking and is unaffected by wheel spin',()=>{
 const chassis=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.8);
 for(const steer of [-.6,0,.6]){
  const turned=chassis.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),steer));
  const expected=steeringRotation(chassis,turned);
  for(const spin of [0,1,3,6]){
   const wheel=turned.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),spin));
   const assembly=steeringRotation(chassis,wheel);
   assert.ok(1-Math.abs(expected.dot(assembly))<1e-10);
   assert.ok(new Vector3(1,0,0).applyQuaternion(assembly).distanceTo(new Vector3(1,0,0).applyQuaternion(wheel))<1e-10);
  }
 }
});
test('static mesh batching preserves transforms and material boundaries',()=>{
 const a=new MeshBasicMaterial(),b=new MeshBasicMaterial(),source=new Group(),destination=new Group();
 for(let i=0;i<30;i++){const m=new Mesh(new BoxGeometry(),i%2?a:b);m.position.x=i;source.add(m);}
 const batches=batchMeshes([source],destination);
 assert.equal(batches.length,2);
 const vertices=batches.reduce((sum,m)=>sum+m.geometry.attributes.position.count,0);
 assert.equal(vertices,30*36);
 for(const m of batches)m.geometry.computeBoundingBox();
 assert.equal(Math.max(...batches.map(m=>m.geometry.boundingBox.max.x)),29.5);
});
