import {checkpointMemory,loadLiveVisuals} from './live-checkpoint.mjs';
import {loadLiveAnimationAssets} from './live-animation-assets.mjs';
import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';

// Initializes the normal pose branch only. It does not fabricate the different
// animation-advance/recovery layouts or claim a complete retained-frame context.
export function loadLiveNormalRider(checkpoint,observation){
 if(!/^[0-9a-f]{16}$/.test(checkpoint.captureId??'')||checkpoint.captureId!==observation.captureId||
    checkpoint.captureBoundary!=='player-frame-entry'||observation.captureBoundary!==checkpoint.captureBoundary||
    observation.bikeAddress!==checkpoint.bikeAddress)throw Error('Animation/checkpoint boundary differs');
 const m=checkpointMemory(checkpoint),address=checkpoint.bikeAddress;
 if(m.u32(address+0x844)||m.u32(address+0x710)||m.u32(address+0xbfc)===2)throw Error('Unsupported normal rider state');
 for(let i=0;i<21;i++)if(observation.records[i]!==m.u32(address+0x740+i*4))throw Error('Animation table differs from checkpoint');
 const assets=loadLiveAnimationAssets(observation),visuals=loadLiveVisuals(checkpoint);
 const vec=(p,o)=>[0,4,8].map(i=>m.f32(p+o+i));
 const animation=p=>{
  const recordPointer=m.u32(p+0x10),framePointer=m.u32(p+0x14);
  const record=assets.records.find(r=>r.token===recordPointer),frame=assets.frames.get(framePointer);
  if(!record||!frame)throw Error('Active normal animation missing');
  let belongs=false;for(let f=record.firstFrame;f;f=f.next)if(f===frame)belongs=true;
  if(!belongs)throw Error('Active animation frame belongs to another record');
  return {record,frame,boundsMin:vec(p,0x218),boundsMax:vec(p,0x224)};
 };
 const bike={pose:m.u32(address+0x724),weight:m.f32(address+0x728),nextPose:m.u32(address+0x72c),fraction:m.f32(address+0x730),secondaryWeight:m.f32(address+0x734),enabled:m.u32(address+0x820),speed:m.f32(address+0x848)};
 const context={bike,records:assets.records,bikeAnimation:animation(address),riderAnimation:animation(visuals.rider.address),
  bodyNode:visuals.bike.bodyNode,riderBodyNode:visuals.rider.bodyNode,
  applyBike:child=>applyMcmAnimationChild(visuals.bike.bodyNode,visuals.bike.components,child),
  applyRider:child=>applyMcmAnimationChild(visuals.rider.bodyNode,visuals.rider.components,child)};
 return {context,assets,visuals};
}
