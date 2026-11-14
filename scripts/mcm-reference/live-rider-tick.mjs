import {loadLiveOrderedDispatch} from './live-ordered-dispatch.mjs';
import {loadLiveAnimationAssets,loadLiveAnimationState} from './live-animation-assets.mjs';
import {loadLiveVisuals} from './live-checkpoint.mjs';
import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';
import {tickMcmRiderParticles} from '../../src/physics/mcm/rider-particle-tick.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';
export function loadLiveRiderTick({world,animations,child,terrain}){
 if(world.captureBoundary!=='rider-tick'||animations.captureBoundary!=='rider-tick'||world.captureId!==animations.captureId||world.bikeAddress!==animations.bikeAddress)throw Error('Rider tick dependency boundary differs');
 if(!Number.isInteger(child.dtBits))throw Error('Missing rider tick timestep');
 const checkpoint={...world,kind:'mcm-partial-local-checkpoint'},ordered=loadLiveOrderedDispatch(checkpoint,world),m=ordered.memory,bike=ordered.actors.get(world.bikeAddress),rider=ordered.actors.get(bike.riderAddress),proxy=bike.proxyAddress;
 const visuals=loadLiveVisuals(checkpoint,{nodes:ordered.transformNodes}),assets=loadLiveAnimationAssets(animations),animation=loadLiveAnimationState(m,proxy,assets);
 return connectLiveRiderTick({ordered,bikeAddress:world.bikeAddress,visuals,assets,animation,child,terrain});
}
export function connectLiveRiderTick({ordered,bikeAddress,visuals,assets,animation,child,terrain}){
 const m=ordered.memory,bike=ordered.actors.get(bikeAddress),rider=ordered.actors.get(bike.riderAddress),proxy=bike.proxyAddress,vector=o=>[0,4,8].map(i=>m.f32(rider.address+o+i));
 rider.previousPosition=vector(0x4c);rider.field138=m.u32(rider.address+0x138);rider.field144=m.u32(rider.address+0x144);rider.region=m.u32(rider.address+0x3a4);rider.field39c=m.u32(rider.address+0x39c);
 for(const [key,field] of [['fieldf8','extentScale'],['field140','flag140'],['field154','contactClass']])Object.defineProperty(rider,key,{get:()=>rider[field],set:value=>{rider[field]=value;}});
 const childBytes=Buffer.from(child.hex,'hex');
 if(childBytes.length!==0x610||m.u32(rider.address+0x14)!==child.address||childBytes.readUInt32LE(0)!==0x4d729c||childBytes.readUInt32LE(0x18)!==rider.address||childBytes.readUInt32LE(0x10)||childBytes.readUInt32LE(0x2c)||child.ownerGate!==0||child.updateAddress!==0x43a0c0)throw Error('Unmapped rider child update branch');
 const point=offset=>{const n=ordered.transformNodes.get(m.u32(rider.address+offset));if(!n)throw Error('Missing rider probe transform');return n;};
 const selected=m.u32(rider.address+0x160),selectedRecord=assets.records.find(a=>a.token===selected);
 if(selected&&!selectedRecord)throw Error('Missing selected rider animation');
 const context={rider,animation,bodyNode:bike.riderTransform,collider:rider.collision,bikeCollider:bike.collision,manager:ordered.dispatch,grid:ordered.grid,gridEnabled:ordered.enabled,paused:child.paused,globalDelta:bitsFloat(child.globalDtBits),selectedRecord,
  points:[0xfc,0x100,0x104,0x10c,0x110,0x118,0x11c,0x120,0x128,0x12c,0x134].map(point),terrain,queryOutput:{point:[0,0,0],normal:[0,0,0],penetration:[0,0,0]},
  applyChild:record=>applyMcmAnimationChild(bike.riderTransform,visuals.rider.components,record),
  updateChildren(dt){if(childBytes.readUInt32LE(0x20)&&!childBytes.readUInt32LE(0x28))tickMcmRiderParticles(new DataView(childBytes.buffer,childBytes.byteOffset,childBytes.length),{dt,paused:context.paused});}};
 return {context,ordered,assets,childBytes,proxy,dt:bitsFloat(child.dtBits)};
}
