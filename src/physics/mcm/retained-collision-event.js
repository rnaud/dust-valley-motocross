import {transitionMcmBikeEvent} from './event-transition.js';

// Original 49e43e..49e47f calls the event wrapper after impulse/grid updates.
// Read owned bike/rider state here, not the substep's pre-collision scratch.
export function applyMcmRetainedCollisionEvent(c,contact){
 const b=c.bike,r=c.rider,p=c.contactPhase,decision=p.normalEventDecision;
 const result=transitionMcmBikeEvent({
  position:b.position,target:b.spawnPosition,velocity:b.velocity,angularVelocity:b.angularVelocity,up:b.up,
  speed:b.field6a4,previousSpeed:b.field564,otherSpeed:decision.otherSpeed,otherVelocity:c.otherBikeVelocity(),
  launch:b.fieldc40,inputPresent:decision.inputPresent,inputResult:decision.inputResult,
  field710:b.field710,field714:b.field714,animation:b.field814&255,frame:c.frameRider.bikeAnimation.frame.index,
  field4bc:b.field4bc,state:b.field844,height0:b.field590,height1:b.field594,suppress:b.field8ac,
  eventKind:b.field8b8,reason:b.field8b4,otherPresent:+!!b.field8b0,counter:b.field8bc,field820:b.field820,
  angle4d8:b.field4d8,angle4f0:b.field4f0,terrainMode:decision.terrainMode,uprightThreshold:b.field86c,
  time:b.field8cc,decel:b.field868,accel:b.field864,invMass:b.inverseMass,
  arg1:0,arg2:0,arg7:1,arg8:b.field8d0,arg9:contact.dynamic,arg10:contact.impulse,arg11:contact.collisionType,arg12:contact.otherCrashed,
  drawRandom:decision.drawRandom,
  setup:{graph:{target:c.bodyNode,source:c.baseNode,components:c.bounds.components,boundsChildren:c.bounds.children},
   forward:b.forward,field4e0:b.field4e0,envelope:c.effect,direction:b.savedHeading,inverted:b.field8a4,field890:b.field890,
   resource:b.field884,normalResource:b.field878,alternateResource:b.field880,
   boundsMin:c.bounds.min,boundsMax:c.bounds.max,liveBoundsMin:b.boundsMin,liveBoundsMax:b.boundsMax,scratch540:b.offset,scratch54c:b.normal,
   rider:{velocity:r.velocity,angularVelocity:r.angularVelocity,previousVelocity:r.previousVelocity,selected:r.selected,active13c:r.flag13c,active16c:r.active16c,kind:r.kind},
   records:p.normalEventSetup.records,drawRandom:p.normalEventSetup.drawRandom}
 });
 b.velocity=result.velocity;b.angularVelocity=result.angularVelocity;b.field844=result.state;
 b.field8b8=result.eventKind;b.field8b4=result.reason;if(!result.otherPresent)b.field8b0=0;
 b.field820=result.field820;b.field710=result.field710;b.field714=result.field714;
 b.field814=((b.field814&0xffffff00)|result.animation)>>>0;
 c.effect=result.envelope;b.savedHeading=result.direction;b.field8a4=result.inverted;b.field890=result.field890;b.field884=result.resource;
 b.boundsMin=result.boundsMin;b.boundsMax=result.boundsMax;b.offset=result.scratch540;b.normal=result.scratch54c;
 Object.assign(r,{velocity:result.rider.velocity,angularVelocity:result.rider.angularVelocity,previousVelocity:result.rider.previousVelocity,
  selected:result.rider.selected,flag13c:result.rider.active13c,active16c:result.rider.active16c,kind:result.rider.kind});
 decision.randomCalls+=result.randomCalls;decision.inputCalls+=result.inputCalls;
 return result;
}
