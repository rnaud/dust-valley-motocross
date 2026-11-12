import test from 'node:test';
import assert from 'node:assert/strict';
import {MCM_HANDLING,advanceLean,suspensionForce} from '../src/mcm-handling.js';
import {DRIVE,engineTorque,createDrivetrain,stepDrivetrain} from '../src/drivetrain.js';
import {createState,stepBike,resetBike} from '../src/world.js';

test('recovered powerband has its torque peak near 7250 RPM and falls before redline',()=>{
 assert.ok(Math.abs(engineTorque(7250)-42.23)<.1);
 assert.ok(engineTorque(7250)>engineTorque(5750)*1.25);
 assert.ok(engineTorque(10000)<engineTorque(7250)*.5);
 assert.equal(engineTorque(0),0);
 // The original interpolates torque samples, not horsepower followed by division.
 assert.ok(Math.abs(engineTorque(7000)-(engineTorque(6750)+engineTorque(7250))/2)<1e-10);
});
test('shift cuts propulsion for 50ms, then restores drive without gear hunting',()=>{
 const e=createDrivetrain(),input={speed:13,throttle:1,grounded:true};e.rpm=7500;
 stepDrivetrain(e,input,.01);assert.equal(e.gear,2);assert.equal(e.force,0);
 for(let i=0;i<4;i++){stepDrivetrain(e,input,.01);assert.equal(e.force,0);}
 stepDrivetrain(e,input,.01);assert.ok(e.force>0);assert.equal(e.gear,2);
 for(let i=0;i<100;i++)stepDrivetrain(e,input,.01);
 assert.equal(e.gear,2);
});
test('engine free-revs in air without thrust or airborne gear changes',()=>{
 const e=createDrivetrain();
 for(let i=0;i<120;i++)stepDrivetrain(e,{speed:30,throttle:1,grounded:false},1/120);
 assert.ok(e.rpm>9500);assert.equal(e.force,0);assert.equal(e.gear,1);
});
test('redline cuts drive and coasting introduces rear engine braking',()=>{
 const e=createDrivetrain();e.gear=5;
 stepDrivetrain(e,{speed:70,throttle:1},1/120);assert.equal(e.force,0);
 stepDrivetrain(e,{speed:20,throttle:0},1/120);assert.equal(e.force,0);assert.ok(e.engineBrake>0);
});
test('40 degree lean target transitions are symmetric and timestep independent',()=>{
 const limit=MCM_HANDLING.maxLean;
 for(const sign of [-1,1]){
  const results=[];
  for(const dt of [1/60,1/120,1/240]){
   let value=sign*limit;
   for(let i=0;i<Math.round(.25/dt);i++){
    const next=advanceLean(value,-sign*limit,dt);
    assert.ok(Math.abs(next-value)<=MCM_HANDLING.leanRate*dt+1e-12);value=next;
   }
   results.push(value);
  }
  assert.ok(Math.max(...results)-Math.min(...results)<1e-10);
 }
});
test('springs support original mass with independent front/rear sag and progressive rate',()=>{
 const force=(x,front)=>suspensionForce({compression:x,velocity:0,mass:MCM_HANDLING.mass,front});
 assert.ok(force(.2,true)>force(.1,true)*2);
 assert.ok(Math.abs(force(.1,false)/force(.1,true)-.6)<1e-12);
 const s=createState({flat:true,height:()=>0});for(let i=0;i<360;i++)stepBike(s,{},1/120);
 const [rear,front]=s.physics.vehicle.wheelInfos;
 assert.ok(rear.suspensionLength<front.suspensionLength);
 assert.ok(Math.abs(rear.suspensionForce+front.suspensionForce-s.physics.chassis.mass*9.81)<5);
});
test('high-speed compression damping is continuous with half the incremental slope',()=>{
 for(const front of [false,true]){
  const limit=(front?MCM_HANDLING.front:MCM_HANDLING.rear).velocityLimit;
  const f=v=>suspensionForce({compression:0,velocity:-v,mass:MCM_HANDLING.mass,front});
  const epsilon=.001,below=(f(limit)-f(limit-epsilon))/epsilon,above=(f(limit+epsilon)-f(limit))/epsilon;
  assert.ok(Math.abs(above/below-.5)<1e-6);
 }
});
test('reset clears transmission, pending shifts and wheel slip',()=>{
 const s=createState({flat:true,height:()=>0});for(let i=0;i<600;i++)stepBike(s,{gas:true},1/120);
 assert.ok(s.engine.gear>1);resetBike(s,0,0,0);
 assert.equal(s.gear,1);assert.equal(s.rpm,DRIVE.idleRpm);assert.equal(s.engine.shiftRemaining,0);
 assert.deepEqual(s.wheelOmega,[0,0]);assert.deepEqual(s.slipRatio,[0,0]);
 stepBike(s,{gas:true},1/120);assert.ok(Number.isFinite(s.speed));
});
