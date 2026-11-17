import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RemixWorld,remixLevels} from '../src/remix-worlds.js';
import {createState,stepBike} from '../src/world.js';
function setup(id){const remix=new RemixWorld(id),state=createState({sand:false,flat:true,customWorld:true,height:remix.height,spawn:remix.spawn}),scene=new THREE.Scene();scene.fog=new THREE.Fog(0,100,500);remix.attach(state,scene);return {remix,state};}
for(const {id} of remixLevels)test(`${id}: ride the complete challenge with actual bike collisions`,()=>{
 const {remix:r,state:s}=setup(id);let secondLapTrailCount,lockedTune;
 for(let n=0;n<18000&&!r.result;n++){
  const p=r.target(),error=Math.atan2(Math.sin(Math.atan2(p.x-s.x,p.z-s.z)-s.yaw),Math.cos(Math.atan2(p.x-s.x,p.z-s.z)-s.yaw));
  const input={gas:s.speed<12,steer:Math.max(-1,Math.min(1,-error*2))};
  // Wait on the approach until there is time to cross the closing bridge.
  if(id==='kitchen'&&s.x< -25&&s.z>87&&s.z<112&&r.time%14>4){input.gas=false;input.brake=true;}
  r.beforeStep(1/120,input,s);stepBike(s,input,1/120);r.afterStep(s);
  assert.ok(Number.isFinite(s.y));
  if(id==='erase'&&r.lap===2){secondLapTrailCount??=r.trails.length;assert.equal(r.trails.length,secondLapTrailCount,'second lap cannot create new road');assert.equal(r.tiles.filter(t=>t.body.world).length,0,'paper collision is gone');}
  if(r.choicePending){r.lockSection(r.sectors.findIndex(s=>!s.locked));lockedTune??=r.sectors[0].tune;}
 }
 assert.equal(r.result?.won,true,JSON.stringify(r.diagnostics()));assert.equal(s.crashed,false);
 if(id==='kitchen'){assert.ok(r.launches>=2);assert.ok(r.coffeeTime>0);}
 if(id==='erase')assert.ok(secondLapTrailCount>100);
 if(id==='opponent'){assert.equal(r.sectors[0].tune,lockedTune);assert.equal(r.sectors.filter(s=>s.locked).length,2);}
 r.dispose();assert.equal(s.physics.world.bodies.length,1,'world cleanup leaves only bike');
});
test('wake shortcut changes route and collision terrain, and remains rideable',()=>{
 const {remix:r,state:s}=setup('giant'),sleeping=r.route(.75),before=r.height(0,70);r.wakeGiant();assert.notEqual(r.route(.75).x,sleeping.x);
 for(let n=0;n<12000&&!r.result;n++){const p=r.target(),e=Math.atan2(Math.sin(Math.atan2(p.x-s.x,p.z-s.z)-s.yaw),Math.cos(Math.atan2(p.x-s.x,p.z-s.z)-s.yaw)),input={gas:s.speed<10,steer:Math.max(-1,Math.min(1,-e*2))};r.beforeStep(1/120,input,s);stepBike(s,input,1/120);r.afterStep(s);}
 assert.notEqual(r.height(0,70),before);assert.equal(r.result?.won,true);r.dispose();
});
test('fall failure cannot turn into a checkpoint win',()=>{const {remix:r,state:s}=setup('giant');r.next=0;s.x=0;s.z=0;s.y=-11;r.afterStep(s);assert.equal(r.result.won,false);assert.equal(r.passed,0);r.dispose();});
test('the opponent learns only the ridden sector and preserves locked geometry',()=>{const {remix:r,state:s}=setup('opponent');s.x=45;s.z=70;r.beforeStep(.1,{gas:true},s);assert.ok(r.sectors[1].tune>.3);assert.equal(r.sectors[0].tune,.3);r.choicePending=true;assert.equal(r.lockSection(1),true);const fixed=r.sectors[1].tune;r.beforeStep(.1,{brake:true},s);assert.equal(r.sectors[1].tune,fixed);r.dispose();});
