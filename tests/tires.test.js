import test from 'node:test';
import assert from 'node:assert/strict';
import {tireForces} from '../src/tires.js';
import {createState,stepBike} from '../src/world.js';

test('unloaded tires provide no drive, braking or cornering force',()=>{
 const f=tireForces({longSpeed:20,sideSpeed:4,load:0,drive:1700,brake:900,camber:.7});
 assert.equal(f.longitudinal,0);assert.equal(f.lateral,0);
});
test('slip produces an opposing lateral force and combined demand stays in the grip ellipse',()=>{
 for(const sideSpeed of [-8,-1,1,8])for(const drive of [0,1000,3000]){
  const f=tireForces({longSpeed:20,sideSpeed,load:700,drive});
  assert.ok(f.lateral*sideSpeed<0);
  assert.ok(Math.hypot(f.longitudinal/(700*2.4),f.lateral/(700*1.72))<=1.000001);
 }
 const coasting=tireForces({longSpeed:20,sideSpeed:2,load:700});
 const powered=tireForces({longSpeed:20,sideSpeed:2,load:700,drive:3000});
 assert.ok(Math.abs(powered.lateral)<Math.abs(coasting.lateral),'power must share available grip');
 assert.ok(Math.abs(powered.lateral)>100,'power must not erase all cornering grip');
});
function turn(speed,steer){
 const s=createState({sand:false,flat:true,height:()=>0});
 for(let i=0;i<120;i++)stepBike(s,{},1/120);
 s.physics.chassis.velocity.z=speed;let heading=0,peakSlip=0;
 for(let i=0;i<120;i++){
  const before=s.yaw;stepBike(s,{gas:true,steer},1/120);
  heading+=Math.atan2(Math.sin(s.yaw-before),Math.cos(s.yaw-before));
  peakSlip=Math.max(peakSlip,s.slip);assert.equal(s.crashed,false);
 }
 return {heading,speed:s.speed,roll:s.roll,peakSlip};
}
test('one second of full input gives a useful corner at 54 and 79 km/h, without a spin',()=>{
 const medium=turn(15,-1),fast=turn(22,-1);
 // A 40° bank and bounded lean transition intentionally turn wider than the
 // old 57° profile. Preserve useful response, speed dependence and symmetry.
 assert.ok(medium.heading>.35&&medium.heading<.65);
 assert.ok(fast.heading>.25&&fast.heading<.5);
 assert.ok(fast.heading<medium.heading,'speed must increase turn radius');
 assert.ok(medium.speed>15&&fast.speed>22,'normal cornering must preserve momentum');
 assert.ok(medium.peakSlip<4&&fast.peakSlip<4);
 assert.ok(medium.roll<-.65,'a strong turn must visibly bank the bike');
});
test('analog input gives progressive symmetric cornering',()=>{
 const left=turn(15,-.5),right=turn(15,.5),full=turn(15,-1);
 assert.ok(left.heading>.25&&left.heading<full.heading*.85);
 assert.ok(Math.abs(left.heading+right.heading)<.001);
 assert.ok(left.roll<0&&right.roll>0);
});
