import {checkpointMemory,loadLiveVisuals} from './live-checkpoint.mjs';
import {loadLiveAnimationAssets,loadLiveAnimationState} from './live-animation-assets.mjs';
import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';

// Initializes the normal pose branch. Extended captures also preserve animation
// history for later retained-frame wiring; this is not a complete frame context.
export function loadLiveNormalRider(checkpoint,observation,{visuals:sharedVisuals}={}){
 if(!/^[0-9a-f]{16}$/.test(checkpoint.captureId??'')||checkpoint.captureId!==observation.captureId||
    checkpoint.captureBoundary!=='player-frame-entry'||observation.captureBoundary!==checkpoint.captureBoundary||
    observation.bikeAddress!==checkpoint.bikeAddress)throw Error('Animation/checkpoint boundary differs');
 const m=checkpointMemory(checkpoint),address=checkpoint.bikeAddress;
 if(m.u32(address+0x844)||m.u32(address+0x710)||m.u32(address+0xbfc)===2)throw Error('Unsupported normal rider state');
 for(let i=0;i<21;i++)if(observation.records[i]!==m.u32(address+0x740+i*4))throw Error('Animation table differs from checkpoint');
 const assets=loadLiveAnimationAssets(observation),visuals=sharedVisuals??loadLiveVisuals(checkpoint);
 const vec=(p,o)=>[0,4,8].map(i=>m.f32(p+o+i));
 const animation=p=>{
  if(observation.retainedFrames)return loadLiveAnimationState(m,p,assets);
  const recordPointer=m.u32(p+0x10),framePointer=m.u32(p+0x14);
  const record=assets.records.find(r=>r.token===recordPointer),frame=assets.frames.get(framePointer);
  if(!record||!frame)throw Error('Active normal animation missing');
  let belongs=false;for(let f=record.firstFrame;f;f=f.next)if(f===frame)belongs=true;
  if(!belongs)throw Error('Active animation frame belongs to another record');
  return {record,frame,boundsMin:vec(p,0x218),boundsMax:vec(p,0x224)};
 };
 const bike={pose:m.u32(address+0x724),weight:m.f32(address+0x728),nextPose:m.u32(address+0x72c),fraction:m.f32(address+0x730),secondaryWeight:m.f32(address+0x734),enabled:m.u32(address+0x820),speed:m.f32(address+0x848)};
 if(observation.retainedFrames){
  const pointers=[address,visuals.rider.address].flatMap(p=>[0x18,0x1c,0x20].map(o=>m.u32(p+o)));
  if(pointers.some((p,i)=>p!==observation.retainedFrames[i]))throw Error('Retained animation pointers differ from checkpoint');
 }
 if(observation.boundsFrames){
  const pointers=[address,visuals.rider.address].map(p=>m.u32(p+0x23c));
  if(pointers.some((p,i)=>p!==observation.boundsFrames[i]))throw Error('Bounds animation pointers differ from checkpoint');
 }
 const context={bike,records:assets.records,bikeAnimation:animation(address),riderAnimation:animation(visuals.rider.address),
  bodyNode:visuals.bike.bodyNode,riderBodyNode:visuals.rider.bodyNode,
  applyBike:child=>applyMcmAnimationChild(visuals.bike.bodyNode,visuals.bike.components,child),
  applyRider:child=>applyMcmAnimationChild(visuals.rider.bodyNode,visuals.rider.components,child)};
 return {context,assets,visuals};
}
