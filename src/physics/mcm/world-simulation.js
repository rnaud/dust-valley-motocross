import {createWorldHeapRuntime} from '../../../scripts/mcm-reference/world-heap-runtime.mjs';
import {connectWorldTerrainNodes} from '../../../scripts/mcm-reference/world-terrain-nodes.mjs';
import {connectWorldTerrainBankReads} from '../../../scripts/mcm-reference/world-terrain-bank-reads.mjs';
import {connectMcmWorldUpdate} from './world-update.js';
import {connectMcmWorldCamera} from './world-camera.js';
import {tickMcmParticlePool} from './particle-pool-tick.js';
import {floatBits} from './math.js';

// Continue an atomic world-entry checkpoint. The initial camera update has
// already happened there. Later frames derive it from the shared live bikes.
// This owns physics/riders/pool and mesh-cache updates, plus retained terrain
// emission when initialFiles supplies the heap. Pixel rendering, device audio
// and particle drawing/submission remain external.
export function connectMcmWorldSimulation(runtime,cameraSnapshot,terrain,{initialFiles}={}){
 const world=connectMcmWorldUpdate(runtime),camera=connectMcmWorldCamera(runtime,cameraSnapshot,terrain);
 const heap=initialFiles?createWorldHeapRuntime(initialFiles):null;
 const bankReads=heap?connectWorldTerrainBankReads(runtime,terrain):null;
 const terrainNodes=heap?connectWorldTerrainNodes(runtime,{address:camera.address,get cameraState(){return camera.retained.state;}},{emission:true,retainedHeap:heap}):null;
 const children=new Map(runtime.world.bikes.map(b=>[b.address,b.artifacts.child.address]));
 const player=runtime.world.entry.bikes[0];let frame=0,partial=false;
 return {runtime,world,camera,heap,terrainNodes,bankReads,get frame(){return frame;},step(delta,{throttle=0,brake=0,steer=0,lean=0}={},services={}){
  if(partial)throw Error('Cannot resume a world checkpoint stopped inside its update');
  if(!Number.isFinite(delta)||delta<0||!Number.isFinite(steer)||!Number.isFinite(lean))throw Error('Invalid world step input');
  if(typeof services.tailControls!=='function')throw Error('World simulation requires chase tail controls');
  // These arrays are diagnostic records, not retained collision state.
  // Keep the per-update guard without accumulating old callback records.
  runtime.ordered.trace.length=0;runtime.ordered.contacts.length=0;
  runtime.setPlayerInput({throttle,brake});
  const input=runtime.bikes.get(player).loaded.input;
  runtime.setFrameInput(player,{...input,steerBits:floatBits(steer),longitudinalBits:floatBits(lean)});
  if(frame)camera.retained.step(delta,{controls:services.cameraControls,tailControls:services.tailControls});
  runtime.setFrameCamera(camera.address,camera.retained.position);
  terrainNodes?.step(frame);terrainNodes?.beginBikeFrame(frame+1);
  const stop=Symbol('terminal partial world checkpoint');
  try{
   world.step(delta,{
    beforeBike:address=>services.observeBike?.(address,'before-bike',runtime.bikes.get(address).projection.projectBody()),
    observeBike:(address,stage)=>{if(stage==='frame-tail')services.observeBike?.(address,'after-bike',runtime.bikes.get(address).projection.projectBody());},
    beforeChildren:()=>{if(services.stopAfterPhysics)throw stop;},
    beforeRider:address=>{if(heap)runtime.setParticleBoundaryWords(address,heap.words(children.get(address)));services.beforeRider?.(address);},
    afterRider:address=>services.afterRider?.(address),
    observeEmitter:services.observeEmitter,
    ...(services.actor?{actor:services.actor}:{}),
   });
  }catch(error){if(error!==stop)throw error;partial=true;return {frame:frame++,complete:false};}
  tickMcmParticlePool(runtime.particles.pool,{dt:delta,paused:runtime.world.context.world.paused});
  for(const actor of runtime.meshes.actors.values())runtime.meshes.draw(actor.actor,{projection:camera.retained.projection});
  for(const bike of runtime.bikes.values())bike.scenePosition?.query();
  return {frame:frame++,complete:true};
 }};
}
