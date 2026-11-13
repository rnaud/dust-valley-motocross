import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,stepBike,resetBike} from '../src/world.js';
import {Vector3,Quaternion} from 'three';
import {bikeLinkagePoints,fitBikeLink} from '../src/bike-linkage.js';

test('playable preview accelerates, releases, disables boost and resets recovered state',()=>{
 const run=boost=>{const s=createState({sand:false,flat:true,height:()=>0,physicsMode:'mcm-preview'});for(let i=0;i<300;i++)stepBike(s,{gas:true,boost},.02);return s;};
 const a=run(false),b=run(true);
 assert.ok(a.speed>10&&a.gear>1);assert.equal(a.crashed,false);
 assert.equal(a.z,b.z);assert.equal(a.speed,b.speed);
 for(let i=0;i<60;i++)stepBike(a,{},.02);
 assert.equal(a.engine.force,0);assert.equal(a.engine.recovered.state,0);
 resetBike(a,0,0,0);assert.equal(a.engine.recovered.randomState,12345);assert.equal(a.engine.gear,1);assert.equal(a.speed,0);
});

test('forks and swingarm terminate at moving wheel axles through steering and travel',()=>{
 for(const travel of [-.3,0,.3])for(const steer of [-.6,0,.6]){
  const p=new Vector3(4,8,-3),q=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.4);
  const wheel=z=>({position:new Vector3(0,-.65+travel,z).applyQuaternion(q).add(p),quaternion:q.clone()});
  const rear=wheel(-1.05),front=wheel(1.1);front.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),steer));
  const links=bikeLinkagePoints(p,q,rear,front);
  for(const i of [1,5])assert.ok(Math.abs(links[i].end.distanceTo(front.position)-.22)<1e-12);
  for(const i of [2,6])assert.ok(Math.abs(links[i].end.distanceTo(rear.position)-.22)<1e-12);
  for(const link of links){const mesh={position:new Vector3(),quaternion:new Quaternion(),scale:new Vector3(1,1,1)};fitBikeLink(mesh,link.start,link.end);for(const [sign,point] of [[-1,link.start],[1,link.end]])assert.ok(new Vector3(0,sign*.5*mesh.scale.y,0).applyQuaternion(mesh.quaternion).add(mesh.position).distanceTo(point)<1e-12);}
 }
});

test('recovered preview contact resists rolling and lateral motion without reversing it',async()=>{
 const {mcmPreviewTireForces}=await import('../src/mcm-preview-contact.js');
 for(const front of [false,true]){
  const rolling=mcmPreviewTireForces({longSpeed:20,sideSpeed:0,load:900,mass:90,front,dt:.02});
  assert.ok(Math.abs(rolling.longitudinal+135)<.001);
  assert.ok(rolling.lateral===0);
  const lateral=mcmPreviewTireForces({longSpeed:0,sideSpeed:20,load:900,mass:90,front,dt:.02});
  assert.ok(Math.abs(lateral.lateral+(front?540:5400))<.001);
  for(const sign of [-1,1])for(const speed of [.0001,.1,2,20]){
   const result=mcmPreviewTireForces({longSpeed:sign*speed,sideSpeed:0,load:900,mass:90,front,dt:.02,brake:true});
   const next=sign*speed+result.longitudinal/90*.02;
   assert.ok(sign*next>=-1e-6);
   assert.ok(Math.abs(next)<=speed+1e-6);
  }
 }
 const airborne=mcmPreviewTireForces({longSpeed:10,sideSpeed:5,load:0,mass:90,dt:.02,drive:1000,brake:true});
 assert.equal(airborne.longitudinal,0);assert.equal(airborne.lateral,0);
});

test('preview braking shortens rollout and steering remains finite on hardpack and sand',()=>{
 for(const sand of [false,true]){
  const run=brake=>{
   const s=createState({sand,flat:true,height:()=>0,physicsMode:'mcm-preview'});
   for(let i=0;i<250;i++)stepBike(s,{gas:true},.02);
   const start=s.z;
   for(let i=0;i<100;i++)stepBike(s,{brake},.02);
   const distance=s.z-start;
   for(let i=0;i<250;i++)stepBike(s,{gas:true,steer:i<125?.25:-.25},.02);
   assert.ok([s.x,s.y,s.z,s.speed,s.roll,s.pitch].every(Number.isFinite));
   return distance;
  };
  assert.ok(run(true)<run(false));
 }
});
