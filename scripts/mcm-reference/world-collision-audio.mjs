import assert from 'node:assert/strict';
import {notifyMcmCollisionSound} from '../../src/physics/mcm/collision-notification.js';
// Disabled device gates are captured facts. Enabled devices require a separate
// playback-status adapter; they must never be silently treated as stopped.
export function connectWorldCollisionAudio(files,world,ordered,random){
 const notifications=new Map();let cameraReady=true;
 for(let i=0;i<world.bikes.length;i++){
  const text=files[`world-audio-${i}.json`];if(!text)throw Error('Missing initial collision audio');
  const record=JSON.parse(text),address=world.bikes[i].address;
  assert.equal(record.captureId,world.entry.captureId);assert.equal(record.captureBoundary,'world-frame-entry');assert.equal(record.bikeAddress,address);
  const actor=ordered.actors.get(address);assert.equal(actor.notification.address,record.notificationAddress);assert.equal(actor.notification.player,record.selectedBike);
  const bytes=Buffer.from(record.notificationHex,'hex');assert.equal(bytes.length,0xa0);assert.equal(record.samples.length,7);
  record.samples.forEach((s,j)=>{
   const b=Buffer.from(s.hex,'hex');assert.equal(b.length,0x178);assert.equal(bytes.readUInt32LE(j<6?0x80+j*4:0x9c),s.address);assert.equal(b.readUInt32LE(0x30),s.deviceOwner);assert.equal(b.readUInt32LE(0x40),s.buffer);
   if(s.deviceEnabled)throw Error('Enabled collision audio requires playback-status integration');
  });
  let shared=notifications.get(record.notificationAddress);
  const identity={notificationHex:record.notificationHex,samples:record.samples,cameraAddress:record.cameraAddress,cameraPositionHex:record.cameraPositionHex,selectedBike:record.selectedBike};
  if(shared)assert.deepEqual(shared.initial,identity,'Shared initial notification differs');
  else{
   const calls=[],camera=Buffer.from(record.cameraPositionHex,'hex');assert.equal(camera.length,12);
   const device={isPlaying(index){assert.ok(record.samples[index]);calls.push(['isPlaying',index]);return 0;},stop(index,reset){calls.push(['stop',index,reset]);},setPosition(index,value){calls.push(['position',index,value]);},setVolume(index,value){calls.push(['volume',index,value]);},play(index,a,b,c){calls.push(['play',index,a,b,c]);}};
   shared={initial:identity,calls,state:{selectedBike:record.selectedBike,cameraPosition:[0,4,8].map(o=>camera.readFloatLE(o)),currentIndex:bytes.readUInt32LE(0x98),riderIndex:6,samples:record.samples.slice(0,6).map(s=>({length:Buffer.from(s.hex,'hex').readUInt32LE(0x174)})),device,random}};
   assert.ok(shared.state.currentIndex<6);notifications.set(record.notificationAddress,shared);
  }
  actor.notification.handler=(bike,impulse,type)=>{
   if(shared.state.selectedBike!==bike.address||bike.state844)return;
   if(!cameraReady)throw Error('Current-frame collision audio camera input required');
   return notifyMcmCollisionSound(shared.state,bike,impulse,type);
  };
 }
 return {notifications,invalidateCamera(){cameraReady=false;},setCamera(address,position){
  assert.equal(position.length,3);assert.ok(position.every(Number.isFinite));
  for(const shared of notifications.values()){assert.equal(shared.initial.cameraAddress,address);shared.state.cameraPosition=position.map(Math.fround);}cameraReady=true;
 }};
}
