import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,stepBike,resetBike,freeTerrain} from '../src/world.js';
import {mcmPreviewSuspension} from '../src/mcm-preview.js';
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
 const {mcmPreviewContactForces}=await import('../src/mcm-preview-contact.js');
 const mcmPreviewTireForces=({longSpeed,sideSpeed,load,mass,front,dt,brake})=>{
  const velocity=[sideSpeed,0,longSpeed],wheel={velocity,axis:[0,0,1],arm:[0,0,0],load};
  const r=mcmPreviewContactForces({[front?'front':'rear']:load>0?wheel:null,velocity,mass,dt,brake});
  return {longitudinal:r.force[2],lateral:r.force[0]};
 };
 for(const front of [false,true]){
  const rolling=mcmPreviewTireForces({longSpeed:20,sideSpeed:0,load:900,mass:90,front,dt:.02});
  assert.ok(Math.abs(rolling.longitudinal+135)<.001);
  assert.ok(rolling.lateral===0);
  const lateral=mcmPreviewTireForces({longSpeed:0,sideSpeed:20,load:900,mass:90,front,dt:.02});
  assert.ok(Math.abs(lateral.lateral+(front?540:5400*Math.fround(.9505)))<.001);
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

test('preview contacts share one stopping budget and accumulate the original combined moment',async()=>{
 const {mcmPreviewContactForces}=await import('../src/mcm-preview-contact.js');
 const velocity=[2,0,10],wheel=arm=>({velocity,axis:[0,0,1],arm,load:900});
 const pair={front:wheel([0,-.5,1]),rear:wheel([0,-.5,-1]),velocity,mass:180,dt:.02};
 const unloaded=mcmPreviewContactForces({...pair,front:{...pair.front,load:0},rear:null,brake:true});
 assert.ok(unloaded.force[2]<0); // A contact flag, not spring load, gates original braking.
 const r=mcmPreviewContactForces(pair);
 assert.ok(Math.abs(r.torque[0]+r.force[2])<.001);
 assert.ok(Math.abs(r.torque[2]-r.force[0])<.001);
 assert.ok(Math.abs(r.torque[1])<.001);
 for(const sign of [-1,1])for(const speed of [.001,.1,1]){
  const v=[0,0,sign*speed],w={velocity:v,axis:[0,0,1],arm:[0,0,0],load:90000};
  const result=mcmPreviewContactForces({front:w,rear:{...w},velocity:v,mass:180,dt:.02,brake:true});
  assert.ok(result.remainingSpeed>=-1e-6);
  assert.ok(Math.hypot(...result.force)<=180*speed/.02+1e-3);
  assert.ok(sign*(v[2]+result.force[2]/180*.02)>=-1e-6);
 }
});

test('recovered steering correction turns both ways and preserves speed',async()=>{
 const {mcmPreviewSteering}=await import('../src/mcm-preview-contact.js');
 for(const angle of [-.03,.03]){
  const result=mcmPreviewSteering({velocity:[0,0,10],axis:[-Math.cos(angle),0,Math.sin(angle)],referenceAxis:[-1,0,0],angle,forwardSpeed:10,dt:.02});
  assert.ok(Math.sign(result.turnAngle)===Math.sign(angle));
  assert.ok(Math.sign(result.velocity[0])===Math.sign(angle));
  assert.ok(Math.abs(Math.hypot(...result.velocity)-10)<1e-5);
 }
 for(const steer of [-.5,.5]){
  const s=createState({sand:true,flat:true,height:()=>0,physicsMode:'mcm-preview'});
  for(let i=0;i<200;i++)stepBike(s,{gas:true},.02);
  let turn=0;
  for(let i=0;i<150;i++){const before=s.yaw;stepBike(s,{gas:true,steer},.02);turn+=Math.atan2(Math.sin(s.yaw-before),Math.cos(s.yaw-before));}
  assert.ok(turn*steer<-.2);assert.equal(s.crashed,false);
  resetBike(s,0,0,0);assert.equal(s.recoveredTurnRate,0);assert.equal(s.recoveredContact,null);
 }
});

test('preview rear traction scales drive with retained acceleration, load share and speed',async()=>{
 const {mcmPreviewContactForces}=await import('../src/mcm-preview-contact.js');
 const wheel=speed=>({velocity:[0,0,speed],axis:[0,0,1],arm:[0,0,0],load:900});
 const base={rear:wheel(1),velocity:[0,0,1],mass:180,dt:.02,drive:3000};
 const initial=mcmPreviewContactForces(base);
 const accelerating=mcmPreviewContactForces({...base,acceleration:[0,0,3000/180]});
 assert.ok(initial.rearTractionScale>.8&&initial.rearTractionScale<.9);
 assert.equal(accelerating.rearTractionScale,Math.fround(.9505));
 assert.ok(initial.driveForce[2]<accelerating.driveForce[2]);
 assert.ok(Math.abs(initial.driveForce[2]-3000*initial.rearTractionScale)<.001);
 const fast=mcmPreviewContactForces({...base,rear:wheel(45*.3048),velocity:[0,0,45*.3048]});
 assert.equal(fast.rearTractionScale,1);assert.ok(Math.abs(fast.driveForce[2]-3000)<.001);
 const lightRear=mcmPreviewContactForces({...base,drive:0,rearShare:.25});
 const heavyRear=mcmPreviewContactForces({...base,drive:0,rearShare:.75});
 assert.ok(lightRear.rearTractionScale<heavyRear.rearTractionScale);
 const uphill=mcmPreviewContactForces({...base,drive:0,bikeForward:[0,.2,Math.sqrt(.96)],roll:.6});
 const downhill=mcmPreviewContactForces({...base,drive:0,bikeForward:[0,-.2,Math.sqrt(.96)],roll:.6});
 assert.ok(uphill.rearTractionScale<downhill.rearTractionScale);
 assert.deepEqual(mcmPreviewContactForces({...base,rear:null}).driveForce,[0,0,0]);
});

test('retained preview acceleration includes spring impulses without applying them twice',()=>{
 const s=createState({sand:false,flat:true,height:()=>0,physicsMode:'mcm-preview'});
 for(let i=0;i<250;i++)stepBike(s,{},.02);
 assert.equal(s.contacts,2);assert.ok(Math.hypot(...s.recoveredAcceleration)<.001);
 for(let i=0;i<100;i++)stepBike(s,{gas:true},.02);
 assert.ok(s.recoveredAcceleration.every(Number.isFinite));
 assert.ok(s.recoveredContact.driveForce[2]>0);
 resetBike(s,0,0,0);assert.deepEqual(s.recoveredAcceleration,[0,0,0]);
});

test('preview balance uses the captured profile and retains forward/back weight history',async()=>{
 const {createMcmPreviewBalance,stepMcmPreviewBalance}=await import('../src/mcm-preview-balance.js');
 const fs=await import('node:fs');
 const record=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/player-state-wine11.json',import.meta.url))).records[0];
 const bike=Buffer.from(record.stateHex,'hex'),c=createMcmPreviewBalance();
 assert.equal(bike.readUInt32LE(0x618),0);
 for(const [name,offset] of [['bikeMass',0x684],['riderMass',0x688],['totalMass',0x68c],['supportDepth',0x5d8]])assert.equal(c[name],bike.readFloatLE(offset));
 assert.equal(c.balanceFilter[1],Math.fround(bike.readFloatLE(0x8cc)*Math.fround(6.3)));
 const input={riderLean:1,contact:true,position:[10,2,20],velocity:[0,0,3],forward:[0,0,1],dt:.02};
 for(let i=0;i<100;i++)stepMcmPreviewBalance(c,input);
 assert.ok(Math.abs(c.frontShare-(240*.5+165*.75)/405)<1e-6);
 assert.ok(c.offset[2]>.24&&c.offset[2]<.26);
 stepMcmPreviewBalance(c,{...input,riderLean:0});
 assert.equal(c.frontShare,.5);assert.equal(c.rearShare,.5);assert.ok(c.balanceFilter[0]>.5);
 for(let i=0;i<150;i++)stepMcmPreviewBalance(c,{...input,riderLean:-1});
 assert.ok(Math.abs(c.frontShare-(240*.5+165*.25)/405)<1e-6);assert.ok(c.offset[2]<-.24);
 stepMcmPreviewBalance(c,{...input,contact:false});
 assert.deepEqual(c.offset,[0,0,0]);assert.equal(c.field4bc,1);
 assert.deepEqual(c.takeoffVelocity,input.velocity.map(x=>Math.fround(x/.3048)));
});

test('preview contact load projects original gravity and drag rather than spring impulses',async()=>{
 const {mcmPreviewBaseForce,mcmPreviewNormalLoad}=await import('../src/mcm-preview-balance.js');
 const rest=mcmPreviewBaseForce([0,0,0]);assert.deepEqual(rest.originalForce,[0,-405,0]);assert.deepEqual(rest.drag,[0,0,0]);
 assert.ok(Math.abs(mcmPreviewNormalLoad(rest.originalForce,[0,1,0],.5)-405*4.448221615*.5)<1e-6);
 assert.equal(mcmPreviewNormalLoad(rest.originalForce,[1,0,0],.5),0);
 const moving=mcmPreviewBaseForce([10,0,0]);assert.ok(moving.drag[0]<0);assert.equal(moving.originalForce[1],-405);
 assert.ok(mcmPreviewNormalLoad(moving.originalForce,[1,0,0],1)>0);
});

test('rider balance reaches tire loads and spring mass shares and clears on reset',()=>{
 const spring={compression:.1,velocity:-.2,mass:183.7,front:true};
 assert.ok(mcmPreviewSuspension({...spring,massShare:.7})>mcmPreviewSuspension({...spring,massShare:.3}));
 const s=createState({sand:false,flat:true,height:()=>0,physicsMode:'mcm-preview'});
 for(let i=0;i<150;i++)stepBike(s,{},.02);
 stepBike(s,{leanForward:true},.02);
 assert.ok(s.recoveredBalance.frontShare>.5);
 assert.ok(s.tireLoads[1]>s.tireLoads[0]);
 assert.deepEqual(s.physics.vehicle.recoveredMassShares,[s.recoveredBalance.rearShare,s.recoveredBalance.frontShare]);
 resetBike(s,0,0,0);assert.deepEqual(s.physics.vehicle.recoveredMassShares,[.5,.5]);assert.equal(s.recoveredBalance.balanceFilter[0],.5);assert.deepEqual(s.recoveredBalance.offset,[0,0,0]);
});

test('recovered air controls preserve local axes, takeoff phase and landing/reset state',async()=>{
 const {createMcmPreviewAir,stepMcmPreviewAir}=await import('../src/mcm-preview-air.js');
 const {bitsFloat}=await import('../src/physics/mcm/math.js');
 const input={position:[0,20,0],quaternion:new Quaternion(),velocity:[0,0,20],angularVelocity:[1,2,3],dt:.02};
 const fs=await import('node:fs');
 const record=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/player-state-wine11.json',import.meta.url))).records[0];
 const native=Buffer.from(record.stateHex,'hex'),defaults=createMcmPreviewAir();
 for(const field of ['710','820','6fc','c68','c6c','c70','c74','c78'])assert.equal(defaults[`field${field}`],native.readUInt32LE(parseInt(field,16)));
 assert.equal(defaults.field730,native.readFloatLE(0x730));
 const c=createMcmPreviewAir(),r=stepMcmPreviewAir(c,input);
 assert.equal(r.active,true);assert.equal(r.applied,false);
 assert.equal(c.fieldc78,1);assert.equal(c.fieldc70,1);
 assert.equal(bitsFloat(c.fieldc6c),Math.fround(.02));
 assert.equal(r.localAngularVelocity[0],Math.fround(Math.fround(.9)));
 assert.equal(r.localAngularVelocity[1],Math.fround(2*Math.fround(.9)));
 const yaw=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),1.2);
 const rotated=stepMcmPreviewAir(createMcmPreviewAir(),{...input,quaternion:yaw,
  velocity:new Vector3(...input.velocity).applyQuaternion(yaw).toArray(),
  angularVelocity:new Vector3(...input.angularVelocity).applyQuaternion(yaw).toArray()});
 for(let i=0;i<3;i++)assert.ok(Math.abs(rotated.localAngularVelocity[i]-r.localAngularVelocity[i])<1e-5);
 const landed=stepMcmPreviewAir(c,{...input,frontContact:true});
 assert.equal(landed.active,false);assert.equal(c.fieldc6c,0);assert.equal(c.field870,1);
 stepMcmPreviewAir(c,input);assert.equal(c.fieldc78,1);assert.equal(c.field870,0);
 const chassis=stepMcmPreviewAir(createMcmPreviewAir(),{...input,chassisContact:true});
 assert.equal(chassis.active,false);
 const banked=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.3);
 const bank=stepMcmPreviewAir(createMcmPreviewAir(),{...input,angularVelocity:[0,0,0],quaternion:banked});
 assert.ok(bank.roll<0);assert.ok(bank.localAngularVelocity[2]<0,'original bank sign drives return toward upright');
});

test('preview airborne lean and steering use recovered rotation without custom throttle torque',()=>{
 const fly=(input,yaw=0)=>{
  const s=createState({sand:false,flat:true,height:()=>0,physicsMode:'mcm-preview'});
  resetBike(s,0,0,yaw);s.physics.chassis.position.y=30;
  for(let i=0;i<20;i++)stepBike(s,input,.02);
  return s;
 };
 const neutral=fly({}),gas=fly({gas:true}),back=fly({leanBack:true}),forward=fly({leanForward:true});
 assert.equal(neutral.contacts,0);assert.equal(gas.contacts,0);
 assert.equal(gas.pitch,neutral.pitch);assert.equal(gas.yaw,neutral.yaw);
 assert.ok(back.pitch>.25);assert.ok(forward.pitch<-.25);
 assert.ok(Math.abs(back.pitch+forward.pitch)<1e-5);
 const right=fly({steer:.5}),left=fly({steer:-.5});
 assert.ok(right.yaw<-.03);assert.ok(left.yaw>.03);
 assert.ok(Math.abs(right.yaw+left.yaw)<1e-5);
 const sideways=fly({leanBack:true},Math.PI/2);
 assert.ok(Math.abs(sideways.pitch-back.pitch)<1e-5,'lean rotates about bike-local pitch at every heading');
 assert.ok(back.recoveredAir.fieldc6c!==0);resetBike(back,0,0,0);
 for(const key of ['field4bc','fieldc6c','fieldc70','fieldc74','fieldc78'])assert.equal(back.recoveredAir[key],0);
});


test('preview rides the starter jumps and lands with recovered airborne controls',()=>{
 const s=createState({sand:false,height:freeTerrain,spawn:{x:0,z:0,yaw:0},physicsMode:'mcm-preview'});
 let landings=0;
 for(let i=0;i<500;i++){
  const r=stepBike(s,{gas:true},.02);
  assert.ok(Number.isFinite(s.x+s.y+s.z));assert.equal(s.crashed,false);
  if(r.landed>.5){landings++;assert.ok(s.speed>15);assert.equal(s.recoveredAir.fieldc6c,0);}
 }
 assert.ok(landings>=3);assert.ok(s.z>175);assert.ok(s.speed>15);
});
