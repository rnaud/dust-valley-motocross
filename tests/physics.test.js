import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,stepBike,resetBike,freeTerrain} from '../src/world.js';
const flat=()=>createState({sand:false,flat:true,height:()=>0});
const run=(s,input,n)=>{for(let i=0;i<n;i++)stepBike(s,input,1/120);};
test('suspension supports chassis at rest without ground snapping',()=>{const s=flat();run(s,{},240);assert.equal(s.contacts,2);assert.ok(s.y>.5&&s.y<.9);assert.ok(Math.abs(s.vy)<.01);assert.ok(s.compression.every(c=>c>0&&c<1));});
test('rear-wheel drive accelerates forward and brakes dissipate momentum',()=>{const s=flat();run(s,{gas:true},600);assert.ok(s.z>25);assert.ok(s.speed>12);run(s,{brake:true},600);assert.ok(s.speed<.2);});
test('analog steering turns left with half-stick and stays upright',()=>{const s=flat();run(s,{gas:true},360);run(s,{gas:true,steer:-.5},240);assert.ok(s.x>3);assert.ok(s.yaw>.3);assert.equal(s.crashed,false);assert.ok(Math.abs(s.roll)<.8);});
test('airborne throttle cannot accelerate the chassis; gravity follows ballistic flight',()=>{const a=flat(),b=flat();for(const s of [a,b]){s.physics.chassis.position.y=30;s.physics.chassis.velocity.set(0,4,10);}run(a,{gas:true},60);run(b,{},60);assert.ok(Math.abs(a.z-b.z)<.01);assert.ok(Math.abs(a.vy-(4-9.81*.5))<.1);assert.equal(a.contacts,0);assert.ok(a.y>25);});
test('a ramp launches both wheels and the bike lands through suspension contact',()=>{const s=createState({sand:false,flat:true,height:(x,z)=>z<0?0:z<20?z*.4:8});s.physics.chassis.position.z=-20;s.physics.chassis.velocity.z=20;let maxAir=0,landed=0;for(let i=0;i<1000;i++){const r=stepBike(s,{gas:true},1/120);maxAir=Math.max(maxAir,s.airtime);landed=Math.max(landed,r.landed);}assert.ok(maxAir>.15);assert.ok(landed>.15);assert.ok(Number.isFinite(s.y));});
test('rider lean rotates airborne chassis without redirecting momentum',()=>{const s=flat();s.physics.chassis.position.y=20;s.physics.chassis.velocity.set(0,0,10);run(s,{lean:1},60);assert.ok(s.pitch>.1);assert.ok(Math.abs(s.x)<.01);});
test('crash recovery clears actual rigid-body velocities',()=>{const s=flat();s.physics.chassis.position.y=20;s.physics.chassis.velocity.set(4,-15,8);run(s,{},180);resetBike(s,0,0,0);assert.equal(s.crashed,false);assert.equal(s.physics.chassis.velocity.length(),0);assert.equal(s.physics.chassis.angularVelocity.length(),0);run(s,{},240);assert.equal(s.contacts,2);});

// A chase camera looking along +Z has screen-right along -X.
for(const direction of [-1,1])test(`joystick ${direction<0?'left':'right'} turns toward the matching screen side`,()=>{const s=flat();run(s,{gas:true},120);run(s,{gas:true,steer:direction*.5},90);assert.ok(s.x*(-direction)>.5);assert.ok(s.yaw*(-direction)>.1);assert.equal(s.crashed,false);});
test('arcade acceleration reaches 60 km/h within 2.5 seconds without flipping',()=>{const s=flat();let time=0;while(s.speed<60/3.6&&time<3){stepBike(s,{gas:true},1/120);time+=1/120;}assert.ok(time<2.5,`0–60 time: ${time}`);assert.equal(s.crashed,false);assert.ok(Math.abs(s.pitch)<.3);});
test('boost adds speed and steering releases to neutral',()=>{const a=flat(),b=flat();run(a,{gas:true},240);run(b,{gas:true,boost:true},240);assert.ok(b.speed>a.speed+2);run(a,{gas:true,steer:.6},60);assert.ok(Math.abs(a.steer)>.02);run(a,{gas:true,steer:0},60);assert.ok(Math.abs(a.yawRate)<.08);assert.ok(Math.abs(a.steer)<.03);});
test('holding air steering produces a bounded lean rather than a barrel roll',()=>{const s=flat();s.physics.chassis.position.y=80;s.physics.chassis.velocity.z=20;run(s,{steer:1},240);assert.equal(s.contacts,0);assert.ok(Math.abs(s.roll)<.6);assert.ok(s.yaw<-.1);assert.ok(Math.abs(s.x)<.01);});

// Regression: the old short half-stick tests missed full-lock rollover at speed.
for(const rough of [false,true])for(const direction of [-1,1])for(const delay of [0,1,3]){
  test(`20s full steering: ${rough?'course terrain':'flat'}, direction ${direction}, ${delay}s launch`,()=>{
    const s=rough?createState({sand:false}):flat();let peakRoll=0;
    for(let i=0;i<2400;i++){
      stepBike(s,{gas:true,steer:i>=delay*120?direction:0},1/120);
      peakRoll=Math.max(peakRoll,Math.abs(s.roll));
      assert.equal(s.crashed,false,`wipeout at ${(i/120).toFixed(2)}s`);
    }
    assert.ok(peakRoll<(rough?1.2:1.02),`excessive lean ${peakRoll}`);
    // Rough full-lock loops can finish on an uphill corner. Verify a rideable exit.
    if(rough)run(s,{gas:true},120);
    assert.ok(s.speed>5,'bike must keep riding and accelerate out of the turn');
  });
}
test('boosted alternating full-steer inputs remain recoverable',()=>{
  const s=flat();
  for(let i=0;i<960;i++){
    stepBike(s,{gas:true,boost:true,steer:Math.floor(i/180)%2?1:-1},1/120);
    assert.equal(s.crashed,false,`wipeout at ${i/120}s`);
  }
  assert.ok(s.speed>5);
});
test('an upside-down ground impact still causes a genuine wipeout',()=>{
  const s=flat();s.physics.chassis.position.y=.3;s.physics.chassis.quaternion.setFromEuler(0,0,Math.PI);
  stepBike(s,{},1/120);
  assert.equal(s.crashed,true);
});
for(const height of [3,6,10,15])for(const pitch of [-.3,0,.3])test(`landing from ${height}m at pitch ${pitch} retains speed and settles`,()=>{
 const s=flat();s.physics.chassis.position.y=height;s.physics.chassis.velocity.z=20;s.physics.chassis.quaternion.setFromEuler(-pitch,0,0);
 let first=-1,landingSpeed=0,minSpeed=Infinity;
 for(let i=0;i<800;i++){
   const r=stepBike(s,{gas:true},1/120);
   if(r.landed&&first<0){first=i;landingSpeed=s.speed;}
   if(first>=0)minSpeed=Math.min(minSpeed,s.speed);
   assert.equal(s.crashed,false);
   if(first>=0&&i>=first+120)break;
 }
 assert.ok(first>0);assert.ok(minSpeed>landingSpeed*.8,`landing scrubbed speed: ${minSpeed}/${landingSpeed}`);
 assert.equal(s.contacts,2);assert.ok(Math.abs(s.pitch)<.15);assert.ok(s.speed>20);
});
for(const speed of [15,22,30])test(`course-shaped jump at ${speed}m/s lands and rides away`,()=>{
 const s=createState({sand:false,height:(x,z)=>5.5*Math.exp(-z*z/90),spawn:{x:0,z:-35,yaw:0}});
 s.physics.chassis.velocity.z=speed;let first=-1,landingSpeed=0,minSpeed=Infinity;
 for(let i=0;i<1000;i++){
  const r=stepBike(s,{gas:true},1/120);
  if(r.landed>.4&&first<0){first=i;landingSpeed=s.speed;}
  if(first>=0)minSpeed=Math.min(minSpeed,s.speed);
  assert.equal(s.crashed,false);
  if(first>=0&&i>first+120)break;
 }
 assert.ok(first>0);assert.ok(minSpeed>landingSpeed*.8);assert.equal(s.contacts,2);
 // A real powerband need not hit the old constant-force speed after one second.
 assert.ok(s.speed>landingSpeed+1,'must accelerate away from the landing');
});

for(const surface of ['flat','free'])test(`accelerate then alternate left/right on ${surface} without spin or braking`,()=>{
 const s=surface==='flat'?flat():createState({sand:false,height:freeTerrain,spawn:{x:80,z:-100,yaw:0}});
 run(s,{gas:true},240);
 for(const direction of [-1,1,-1,1]){
  const entrySpeed=s.speed;
  for(let i=0;i<120;i++){
   stepBike(s,{gas:true,steer:direction},1/120);
   assert.equal(s.crashed,false);assert.ok(Math.abs(s.yawRate)<1.5,`uncommanded spin: ${s.yawRate}`);
   assert.ok(s.speed>entrySpeed*.75,`turn scrubbed speed: ${s.speed}/${entrySpeed}`);
   if(i===60)assert.ok(s.yawRate*(-direction)>.1,'must reverse yaw within half a second');
  }
 }
 run(s,{gas:true},90);assert.ok(Math.abs(s.yawRate)<.1,'release must stop turning');
});
