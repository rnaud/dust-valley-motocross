import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {loadFrameEmitter} from './live-frame-effects.mjs';
import assert from '../../src/physics/mcm/captured-invariants.js';
import {loadLiveCollisionWorld} from './live-collision-world.mjs';
import {loadLiveFrameEnvironment} from './live-frame-environment.mjs';
import {loadLiveAnimationAssets} from './animation-assets-loader.mjs';
import {loadLiveActorTree} from './live-actor-tree.mjs';
import {bitsFloat} from '../../src/physics/mcm/math.js';
// Atomic initialization evidence, not a whole-world stepper. The later AI-entry
// fixture is deliberately excluded: it belongs to a different stopped boundary.
export function loadLiveWorldEntry(files){
 const read=name=>{assert.ok(files[name],'Missing world-entry dependency '+name);return JSON.parse(files[name]);},entry=read('world-entry.json');
 assert.equal(entry.schemaVersion,1);assert.equal(entry.kind,'mcm-world-entry');assert.equal(entry.captureBoundary,'world-frame-entry');
 const body=CapturedBytes.from(entry.actorHex,'hex'),app=CapturedBytes.from(entry.worldHex,'hex');assert.equal(body.length,0x18cc);assert.equal(app.length,0x1330);
 assert.equal(body.readUInt32LE(0x30),entry.bikes[0]);assert.equal(app.readInt16LE(0x107a)+1,entry.bikes.length);assert.equal(new Set(entry.bikes).size,entry.bikes.length);
 assert.equal(entry.remoteTable.length,app.readInt32LE(0x314));assert.ok(entry.remoteTable.every(a=>a===0),'Uncaptured remote bike');
 const blocks=[{address:entry.actor,size:body.length,hex:entry.actorHex},{address:entry.world,size:app.length,hex:entry.worldHex}],bikes=[];
 const append=block=>{const bytes=CapturedBytes.from(block.hex,'hex');assert.equal(bytes.length,block.size);for(const previous of blocks){const start=Math.max(block.address,previous.address),end=Math.min(block.address+block.size,previous.address+previous.size);if(start<end)assert.ok(bytes.subarray(start-block.address,end-block.address).equals(CapturedBytes.from(previous.hex,'hex').subarray(start-previous.address,end-previous.address)),'Atomic world bytes differ');}blocks.push(block);};
 for(let i=0;i<entry.bikes.length;i++){
  const artifacts=Object.fromEntries(['bike','environment','animations','collision','child'].map(kind=>[kind,read(`world-${kind}-${i}.json`)]));
  if(entry.controllerEnvironmentsCaptured&&CapturedBytes.from(artifacts.bike.blocks.find(b=>b.address===entry.bikes[i]).hex,'hex').readUInt32LE(0x614))artifacts.aiEnvironment=read(`world-ai-environment-${i}.json`);
  if(entry.effectsCaptured)artifacts.effects=read(`world-effects-${i}.json`);
  for(const source of Object.values(artifacts)){assert.equal(source.captureId,entry.captureId);assert.equal(source.captureBoundary,entry.captureBoundary);assert.equal(source.bikeAddress,entry.bikes[i]);}
  for(const kind of ['bike','environment','collision',...(artifacts.aiEnvironment?['aiEnvironment']:[])])for(const block of artifacts[kind].blocks)append(block);
  const checkpoint=artifacts.bike,collision=loadLiveCollisionWorld(checkpoint,artifacts.collision),environment=loadLiveFrameEnvironment(checkpoint,artifacts.environment),animations=loadLiveAnimationAssets(artifacts.animations);
  const memory=collision.memory,child=artifacts.child,rider=memory.u32(entry.bikes[i]+0x874);
  assert.equal(child.rider,rider);assert.equal(child.address,memory.u32(rider+0x14));assert.ok([0x610,0x618].includes(CapturedBytes.from(child.hex,'hex').length),'Invalid rider child allocation size');
  append({address:rider,size:0x3ac,hex:child.riderHex});append({address:child.address,size:child.hex.length/2,hex:child.hex});append({address:child.poolAddress,size:0x2004,hex:child.poolHex});
  assert.equal(child.particleStride,72);assert.equal(child.particleOrder,'initial-allocation-order');assert.equal(child.particlesHex.length,1000*72*2);
  const pool=CapturedBytes.from(child.poolHex,'hex'),particles=CapturedBytes.from(child.particlesHex,'hex');
  for(let j=0;j<1000;j++)append({address:pool.readUInt32LE(0x44+j*4),size:72,hex:particles.subarray(j*72,(j+1)*72).toString('hex')});
  let emitters;
  if(artifacts.effects){
   const records=artifacts.effects.visualEffects;assert.equal(records.length,3);
   emitters=records.map((record,j)=>{assert.equal(record.address,memory.u32(entry.bikes[i]+[0xc94,0xc98,0xca0][j]));append(record);return loadFrameEmitter(record,j===2);});
   assert.equal(child.sprayAddress,records[1].address);append({address:child.sprayAddress,size:0x614,hex:child.sprayHex});
   const environment=artifacts.effects.effectsEnvironment;assert.equal(environment.world,entry.world);assert.equal(environment.enabled,app.readUInt32LE(0x718));assert.equal(environment.occlusion,app.readUInt32LE(0x714));
   assert.equal(environment.shape,memory.u32(entry.bikes[i]+0xca8));assert.equal(CapturedBytes.from(environment.targetHex,'hex').length,12);
   assert.equal(child.paused,app.readUInt32LE(0x132c));assert.equal(child.dtBits,entry.dtBits);assert.equal(child.updateAddress,0x43a0c0);
  }
  if(artifacts.aiEnvironment){
   const routeMemory=new Map(artifacts.aiEnvironment.blocks.map(b=>[b.address,CapturedBytes.from(b.hex,'hex')]));
   for(const bike of entry.bikes){const count=memory.u32(bike+0xb00),address=memory.u32(bike+0xaf4);if(!count)continue;
    const table=routeMemory.get(address);assert.ok(table&&table.length===count*4,'Missing initial AI route table');
    for(let j=0;j<count;j++)assert.equal(routeMemory.get(table.readUInt32LE(j*4))?.length,44,'Missing initial AI route node');
   }
  }
  bikes.push({emitters,address:entry.bikes[i],artifacts,collision,environment,animations,position504:[0x504,0x508,0x50c].map(o=>memory.f32(entry.bikes[i]+o))});
 }
 const tree=loadLiveActorTree(bikes[0].artifacts.bike,bikes[0].artifacts.collision,read('world-actor-tree.json'));
 assert.equal(tree.nodes.get(entry.actor)?.update,0x4590b0);
 const target=bikes.find(b=>b.address===entry.target);assert.ok(target,'Uncaptured selected target');assert.equal(target.collision.memory.u32(entry.target+0xc30),entry.targetExcluded);target.excluded=entry.targetExcluded;
 assert.equal(body.readUInt32LE(0x44),entry.view);
 const markerAddress=body.readUInt32LE(0x6c);let marker=null;
 if(markerAddress){const bytes=CapturedBytes.from(entry.markerHex,'hex');assert.equal(bytes.length,0x24);marker={address:markerAddress,enabled:bytes.readUInt32LE(0x20)};}
 return {entry,bikes,tree,context:{world:{menu:app.readUInt32LE(0x614),paused:app.readUInt32LE(0x132c),refresh:app.readUInt32LE(0x734),aiCount:app.readInt16LE(0x107a),remoteCount:app.readInt32LE(0x314),network:app.readUInt32LE(0x318),raceKind:app.readUInt16LE(0x1072),remoteIds:entry.remoteTable.map((_,i)=>app.readUInt32LE(0xd00+i*40))},view:{target},player:bikes[0],ai:bikes.slice(1),remote:entry.remoteTable.map(()=>null),running:body.readUInt32LE(0x80),countdownBits:body.readUInt32LE(0x7c),stopRequested:body.readUInt32LE(0x84),raceEnabled:body.readUInt32LE(0x18c8),marker,localIdentityScratch:entry.localIdentityScratch},delta:bitsFloat(entry.dtBits)};
}
