import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,stepBike,resetBike} from '../src/world.js';
import {Vector3,Quaternion} from 'three';
import {bikeLinkagePoints,fitBikeLink} from '../src/bike-linkage.js';

test('playable preview accelerates, releases, disables boost and resets recovered state',()=>{
 const run=boost=>{const s=createState({flat:true,height:()=>0,physicsMode:'mcm-preview'});for(let i=0;i<300;i++)stepBike(s,{gas:true,boost},.02);return s;};
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
