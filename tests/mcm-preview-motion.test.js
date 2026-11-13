import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Body,Vec3} from 'cannon-es';
import {stepMcmPreviewLinear,installMcmPreviewLinear} from '../src/mcm-preview-motion.js';
import {floatBits} from '../src/physics/mcm/math.js';
const FT=.3048,LBF=4.448221615,SLUG=14.59390294;

test('preview SI adapter matches original force-to-linear execution fixtures',()=>{
 const {fixtures}=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/force-linear-wine11.json',import.meta.url)));
 for(const {input:c,outputBits} of fixtures){
  const {original:r}=stepMcmPreviewLinear({position:c.position.map(v=>v*FT),velocity:c.velocity.map(v=>v*FT),
   force:c.totalForce.map(v=>v*LBF),inverseMass:c.inverseMass/SLUG,dt:c.dt,frozen:c.frozen});
  assert.deepEqual([...r.position,...r.velocity,r.speed].map(floatBits),outputBits.slice(0,7));
 }
});

test('installed preview integrator applies force once and retains angular integration and history',()=>{
 const body=new Body({mass:100,linearDamping:0,angularDamping:0}),reference=new Body({mass:100});
 for(const b of [body,reference]){b.position.set(3,4,5);b.velocity.set(1,2,3);b.force.set(200,300,400);b.angularVelocity.set(.1,.2,.3);}
 installMcmPreviewLinear(body,()=>true);
 const expected=stepMcmPreviewLinear({position:[3,4,5],velocity:[1,2,3],force:[200,300,400],inverseMass:.01,dt:.02});
 reference.integrate(.02,true,false);body.integrate(.02,true,false);
 assert.deepEqual(body.position.toArray(),expected.position);assert.deepEqual(body.velocity.toArray(),expected.velocity);
 assert.deepEqual(body.previousPosition.toArray(),[3,4,5]);assert.deepEqual(body.quaternion,reference.quaternion);
 assert.ok(Math.abs(body.velocity.x-1.04)<1e-5);
 body.sleep();const before=body.position.clone();body.integrate(.02,true,false);assert.deepEqual(body.position,before);
});

test('disabled preview integration preserves Cannon crash fallback',()=>{
 const a=new Body({mass:10}),b=new Body({mass:10});
 for(const body of [a,b]){body.position.set(100.123,2,3);body.velocity.copy(new Vec3(4,5,6));body.force.set(10,20,30);}
 installMcmPreviewLinear(a,()=>false);a.integrate(.02,true,false);b.integrate(.02,true,false);
 assert.deepEqual(a.position,b.position);assert.deepEqual(a.velocity,b.velocity);
});
