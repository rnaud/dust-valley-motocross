import {connectLiveFrameFinish} from './live-frame-finish.mjs';
import {connectLiveFrameEffects} from './live-frame-effects.mjs';
import {connectLiveFrameEvents} from './live-frame-events.mjs';
import {checkpointMemory,loadLiveVisuals,loadLiveRider} from './live-checkpoint.mjs';
import {loadLiveNormalRider} from './live-normal-rider.mjs';
import {loadLiveFrameEnvironment} from './live-frame-environment.mjs';
import {loadLiveCollisionWorld} from './live-collision-world.mjs';
import {loadLiveSubstepStart} from './live-substep-start.mjs';
import {loadLiveWheelContacts} from './live-wheel-contacts.mjs';

// Development bootstrap: fail at an unmapped dependency instead of letting an
// undefined value silently turn into zero/NaN. This is not yet a full context.
const strict=(value,name)=>new Proxy(value,{get(target,key,receiver){
 if(typeof key==='string'&&!(key in target))throw Error(`Unmapped live frame dependency: ${name}.${key}`);
 return Reflect.get(target,key,receiver);
}});
export function loadLiveFrameBootstrap({checkpoint,animations,environment,collision,row,terrain,throttle,brake}){
 if(!Number.isInteger(throttle)||!Number.isInteger(brake))throw Error('Explicit digital action responses required');
 const m=checkpointMemory(checkpoint),a=checkpoint.bikeAddress,component=m.u32(a+0x8ec);
 const world=loadLiveCollisionWorld(checkpoint,collision),visuals=loadLiveVisuals(checkpoint,{nodes:world.transformNodes,extraRoots:[m.u32(component+0x50)]});
 const animation=loadLiveNormalRider(checkpoint,animations,{visuals}),env=loadLiveFrameEnvironment(checkpoint,environment);
 if(!env.input||!animations.retainedFrames)throw Error('Complete input/animation observations required');
 // The retained adapter builds a live view of c.bike at frame end. Do not
 // retain the normal-pose helper's detached bike view in its spread arguments.
 const frameRider={...animation.context,components:visuals.bike.components};delete frameRider.bike;
 const start=loadLiveSubstepStart(checkpoint,{dt:m.f32(a+0x8cc),throttle,brake,visuals});
 const contact=loadLiveWheelContacts(checkpoint,row,terrain,{visuals,dt:m.f32(a+0x8cc),componentRate:0});
 const bike={};
 for(const o of [0x8b4,0x6fc,0x568,0x8d4,0xbfc,0x820,0x710,0x714,0x814,0x844,0x614,0xc68,0xb04,0xb08,0x724,0x88c,0x884,0x8b0,0xc40,0x8c4,0x8ac,0x4bc,0x870,0xc6c,0xc78,0x620,0x8bc,0x61c,0x6e0])bike[`field${o.toString(16)}`]=m.u32(a+o);
 for(const o of [0xb6c,0x6f4,0x730,0x6a8,0x83c,0x840,0x8c8,0x8cc,0xbf8,0x6f8,0x564,0x5ec,0x848,0x73c,0x700,0xbd8,0x87c,0x894,0x590,0x594,0x4d8,0x4dc,0x4e0,0x4e4,0x888,0x6b0,0x5e4,0x680,0x678,0x684,0x694,0x6a4,0x84c,0x690,0x698,0x69c,0x6a0,0x718,0xb4c,0xc70,0xc74,0x6b8,0x6bc,0x6c0,0x6c4,0x6c8,0x6cc,0x688,0x68c,0x5d8,0x598,0x59c,0x5a0,0x5a4,0x560,0x5b0,0x5b4,0xba8,0x738,0x6d4,0x6d0,0x4ec,0x5e8,0x5f0,0x5f8,0x5fc,0x604,0x660,0x664,0x668,0x5e0,0x5f4,0x600,0x5b8,0x5bc,0x5c0,0x5c4,0x5c8,0x5cc,0x5d0,0x5d4,0x6ac,0x5dc,0x6d8,0x6dc])bike[`field${o.toString(16)}`]=m.f32(a+o);
 const vec=(address,offset)=>new Float64Array([0,4,8].map(i=>m.f32(address+offset+i)));
 for(const [key,o] of Object.entries({axis624:0x624,position:0x4f8,velocity:0x510,forward:0x4c0,up:0x4cc,tangent:0x578,rearTangent:0x584,normal:0x54c,offset:0x540,referencePosition:0x504,angularVelocity:0x534,worldAngularVelocity:0x528,localLever:0x654,acceleration:0x51c}))bike[key]=vec(a,o);
 bike.mass=m.f32(a+0x558);bike.inverseMass=m.f32(a+0x55c);
 const stack=contact.stack,sv=o=>new Float64Array([0,4,8].map(i=>stack.f32(o+i)));
 const filter=m.u32(a+0x8f8),frontPart=m.u32(a+0x8e4),rearPart=m.u32(a+0x8e8);
 const rider=loadLiveRider(checkpoint).rider;
 const wheelFront=m.u32(a+0x8dc),wheelRear=m.u32(a+0x8e0);
 const p=strict({...contact.context,
  controllerHandoff:strict({},'controllerHandoff'),normalEventSetup:strict({},'normalEventSetup'),
  normalAlignment:strict({local:sv(0x420)},'normalAlignment'),
  chassisContact:strict({absTurn:stack.f32(144),coefficients:sv(1500),arm:sv(2220),normal:sv(2208),velocity:sv(1488)},'chassisContact'),
  chassisResponse:strict({scratch:[240,236,128,184,180,244,176,232,172].map(o=>stack.f32(o))},'chassisResponse'),
  chassisImpulse:strict({squaredSpeed:stack.f32(576)},'chassisImpulse'),
  singleContactForce:strict({torque:sv(720),frontNormal:sv(1164),rearNormal:sv(1152),frontProjection:sv(1476),rearProjection:sv(1440),partials:[560,564,552,556].map(o=>stack.f32(o)),rearScale:[stack.f32(548),stack.f32(396)],driveTorque:sv(1404)},'singleContactForce'),
  pairedContactForce:strict({rearNormal:sv(1128),frontNormal:sv(1140),rearProjection:sv(2808),frontProjection:sv(2820)},'pairedContactForce'),
  angularIntegration:strict({local:sv(1080),opposing:sv(1068)},'angularIntegration'),
  linearIntegration:strict({deltaVelocity:sv(1248),rotation:stack.f32(120)},'linearIntegration'),
  motionTransform:strict({front:{scale:m.f32(wheelFront+0x48)},rear:{scale:m.f32(wheelRear+0x48)},signedDt:stack.f32(124),rearDelta:stack.f32(108),angle:stack.f32(160)},'motionTransform'),
  balanceFilter:[m.f32(filter),m.f32(filter+4)],balanceScratch:[0x25c,0x1b8,0x1b4,0x70].map(o=>stack.f32(o)),
  balanceGeometryScratch:[0x384,0x388,0x38c,0x258,0x810,0x814,0x818,0x804,0x808,0x80c,0x7f8,0x7fc,0x800].map(o=>stack.f32(o)),
  driveScalar:stack.f32(84),rearLoad:strict({arm:sv(960),angularCross:sv(1092),force:sv(696)},'rearLoad'),
  rearMotion:strict({normalLoad:stack.f32(96),tangent:sv(972),alignment:stack.f32(428),combined:sv(816),direction:sv(1260)},'rearMotion'),
  combinedTireForce:sv(1812),combinedTireMagnitude:stack.f32(264),
  brakes:{front:{magnitude:stack.f32(260),requested:stack.f32(408),force:sv(924)},rear:{magnitude:stack.f32(248),requested:stack.f32(252),force:sv(912)}},
  frontMotion:strict({normalLoad:stack.f32(92),tangent:sv(984),alignment:stack.f32(432),forwardMagnitude:stack.f32(80),linear:sv(1236),combined:sv(828),speed:stack.f32(56)},'frontMotion'),
  rearSuspension:strict({displacement:sv(1176),suspensionVelocity:sv(2112),compression:stack.f32(132),travel:stack.f32(568),contactLimited:stack.u32(64),active:stack.u32(164)},'rearSuspension'),
  frontSuspension:strict({displacement:sv(0x4a4),velocity:sv(0x84c),compression:stack.f32(0x88),travel:stack.f32(0x23c),contactLimited:stack.u32(0x3c),active:stack.u32(0xa8)},'frontSuspension'),
  frontMountNode:visuals.nodes.get(m.u32(component)),chassisLocal:[0x630,0x63c,0x648].map(o=>vec(a,o)),
  chassisWorld:[0x36c,0x3e4].map(sv),chassisSurface:[0x2a0,0x2c4].map(sv),chassisNormals:[0x4b0,0x6d8].map(sv),chassisDepth:[stack.f32(0xbc),stack.f32(0x194)],
  responseScratch:[0x264,0x260,0x1c0,0x1bc].map(o=>stack.f32(o)),suspensionForces:strict({front:{force:sv(1032),dampingForce:sv(2196)},rear:{force:sv(1044),dampingForce:sv(2184)}},'suspensionForces'),traction:strict({scratch:[68,104,192,592,588,420,416,424,276,584,280,412].map(o=>stack.f32(o)),tire:strict({magnitude:stack.f32(268),force:sv(1212)},'rearTire')},'traction'),frontLoad:strict({arm:sv(1020),angularCross:sv(1104),scratch354:sv(852),force:sv(684)},'frontLoad'),contactCorrection:strict({acceleration:sv(948),get controller170(){return rider.kind;},set controller170(value){rider.kind=value;},get controller140(){return rider.field140;},set controller140(value){rider.field140=value;}},'contactCorrection'),frontTire:strict({magnitude:stack.f32(272),force:sv(1224),direction:sv(1932)},'frontTire')},'contactPhase');
 const context=strict({bike:strict(bike,'bike'),bodyNode:visuals.bike.bodyNode,proxy:visuals.rider.bodyNode,
  frameRider,loopRider:strict({},'loopRider'),resetDecision:env.resetDecision,
  rider,engine:start.context.engine,engineEntry:start.context,suspension:start.suspension,
  front:{limited:m.f32(wheelFront+0x4c)},rear:{limited:m.f32(wheelRear+0x4c)},
  component8e4:{limit:m.f32(frontPart+0x48),field58:m.f32(frontPart+0x58),value:vec(frontPart,0x4c),field5c:m.f32(frontPart+0x5c)},
  component8e8:{limit:m.f32(rearPart+0x54),limitAngle:m.f32(rearPart+0x48),divisor:m.f32(rearPart+0x4c),field58:m.f32(rearPart+0x58),field5c:m.f32(rearPart+0x5c)},referenceNode:start.suspension.positionNode,
  terrain,contactPhase:p,componentNode:contact.context.node,frontNode:contact.context.frontNode,rearNode:contact.context.rearNode,
  componentAxis:contact.context.componentAxis,componentAngle:contact.context.componentAngle,riderComponentLimit:m.f32(component+0x48),
  frontRadius:contact.context.radius,rearRadius:contact.context.rearRadius,points:contact.context.points,heights:contact.context.heights,
  contactScratch:Object.fromEntries(['resampleNormal','rearResampleNormal','probeNormals','refinedNormals'].map(k=>[k,contact.context[k]]))},'context');
 const random=connectLiveFrameEvents(context,{checkpoint,memory:m,animation,environment:env,row,strict});
 const ordered=connectLiveFrameFinish(context,{checkpoint,memory:m,collision,world,environment:env});
 if(env.resetSupport){
  if(env.resetDecision.mode!==0)throw Error('Unsupported live reset mode');
  const support=env.resetSupport;
  Object.assign(context,{setting:env.resetDecision.setting,playerCount:support.playerCount,aiCount:support.aiCount,
   enumerationDisabled:support.enumerationDisabled,selectTerrain:undefined,selectCourse:undefined,observeResetAvoidance:undefined,
   pose:{position:[...sv(0x378)],forward:[...sv(0x2f4)]},
   observerBike:support.observerBikeAddress===a?context.bike:null,
   bikes:support.bikes.map(({address,fieldc30})=>{
    if(address===a){context.bike.fieldc30=fieldc30;return context.bike;}
    const other=ordered.actors.get(address);if(!other)throw Error('Reset bike missing from captured actor graph');
    other.fieldc30=fieldc30;return other;
   })});
 }
 connectLiveFrameEffects(context,{checkpoint,memory:m,row});
 return {context,random,ordered,input:env.input,mode:env.resetDecision.mode,visuals,world,animation,environment:env,stack:contact.stack};
}
