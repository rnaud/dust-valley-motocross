import {loadLiveOrderedDispatch} from './live-ordered-dispatch.mjs';
import {dispatchMcmCollisionState} from '../../src/physics/mcm/collision-substep.js';

// Actor views share player state; callbacks must never consume a detached copy.
export function connectLiveFrameFinish(c,{checkpoint,memory:m,collision,world,environment:env}){
 if(env.terrainMode===null)return;
 const a=checkpoint.bikeAddress,b=c.bike,p=c.contactPhase;
 const ordered=loadLiveOrderedDispatch(checkpoint,collision,{world});
 const actor=ordered.actors.get(a),rider=ordered.actors.get(m.u32(a+0x874));
 if(!actor||!rider||actor.transform!==c.bodyNode||actor.riderTransform!==c.proxy)throw Error('Finish actor graph differs');
 const alias=(target,key,owner,field)=>Object.defineProperty(target,key,{enumerable:true,configurable:true,get:()=>owner[field],set:value=>{owner[field]=value;}});
 for(const field of ['position','velocity','angularVelocity','worldAngularVelocity','inverseMass'])alias(actor,field,b,field);
 for(const [key,field] of Object.entries({state844:'field844',speed:'field6a4',heading:'field4e0',restitution:'field5e0',scratch540:'offset',field654:'localLever',carry:'field8c8',field8a8:'field8a8',field618:'field618',field8ac:'field8ac',field888:'field888'}))alias(actor,key,b,field);
 c.rider.baseAngularVelocity=[0,4,8].map(o=>m.f32(rider.address+0x64+o));
 for(const [key,field] of Object.entries({angular:'baseAngularVelocity',velocity:'previousVelocity',alternateVelocity:'velocity',alternateAngular:'angularVelocity',flag13c:'flag13c',flag140:'field140'}))alias(rider,key,c.rider,field);
 b.field8a8=m.u32(a+0x8a8);b.fieldc7c=m.f32(a+0xc7c);b.field818=m.f32(a+0x818);
 c.mode=env.resetDecision.mode;c.collision=actor.collision;c.grid=ordered.grid;c.gridEnabled=ordered.enabled;
 // Original 0x40fbb0 delegates only pair/callback restoration here; the
 // scalar rider flags are reset by clearMcmCrashRider.
 if(env.resetSupport)c.restoreRiderVisual=()=>{
  const a=rider.collision.owner,b=actor.collision.owner;
  ordered.dispatch.pairs[a][b]=ordered.dispatch.pairs[b][a]=3;
  rider.collision.setCallbacks([0x40b9e0,0x40ba00]);
 };
 c.dispatch={manager:ordered.dispatch,run(){
  const randomBefore=p.normalEventDecision.randomCalls,step={bike:actor,collision:c.collision,manager:ordered.dispatch,remaining:p.control20};
  dispatchMcmCollisionState(step);
  p.bodyPosition=b.position;p.velocity=b.velocity;p.angularVelocity=b.worldAngularVelocity;
  p.chassisResponse.angularXY=b.angularVelocity.slice(0,2);p.field53c=b.angularVelocity[2];
  p.chassisImpulse.speed=b.field6a4;p.state844=b.field844;p.offset=b.offset;p.frontLoad.localArm=b.localLever;
  p.normalEventJoin.delay=b.field8c8;p.control20=p.normalEventJoin.flag=step.remaining;
  return p.normalEventDecision.randomCalls-randomBefore;
 }};
 return ordered;
}
