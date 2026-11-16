import {loadLiveOrderedDispatch} from './live-ordered-dispatch.mjs';
import {checkpointMemory,loadLiveVisuals} from './live-checkpoint.mjs';
import {loadLiveAnimationState} from './animation-assets-loader.mjs';
import {connectLiveRiderTick} from './live-rider-tick.mjs';
// Both rider contexts share collision actors, transforms and particle storage.
// Their owning bike simulations still need to be connected before world ticks.
export function connectWorldRiderContexts(world,terrain){
 const first=world.bikes[0].artifacts,ordered=loadLiveOrderedDispatch(first.bike,first.collision),riders=[];let sharedParticles;
 for(const bike of world.bikes){
  const {artifacts,animations}=bike,m=checkpointMemory(artifacts.bike),proxy=m.u32(bike.address+0xc8c);
  const visuals=loadLiveVisuals(artifacts.bike,{nodes:ordered.transformNodes}),animation=loadLiveAnimationState(m,proxy,animations);
  const external=connectLiveRiderTick({ordered,bikeAddress:bike.address,visuals,assets:animations,animation,child:artifacts.child,terrain,sharedParticles});
  if(!sharedParticles)sharedParticles={address:artifacts.child.poolAddress,pool:external.pool,poolBytes:external.poolBytes,particleBytes:external.particleBytes,particleStride:external.particleStride,stableParticleOrder:external.stableParticleOrder};
  riders.push({bikeAddress:bike.address,visuals,animation,external});
 }
 return {ordered,riders,particles:sharedParticles};
}
