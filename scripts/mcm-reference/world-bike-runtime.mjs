import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {connectWorldCollisionAudio} from './world-collision-audio.mjs';
import {connectLiveSceneRiderPosition} from './live-scene-rider-position.mjs';
import {connectWorldMeshes} from './world-mesh-runtime.mjs';
import {loadLiveWorldEntry} from './live-world-entry.mjs';
import {loadLiveOrderedDispatch} from './live-ordered-dispatch.mjs';
import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {connectLiveRiderTick} from './live-rider-tick.mjs';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
import {connectMcmRetainedBikeBody} from '../../src/physics/mcm/retained-bike-body.js';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {advanceMcmRiderTick} from '../../src/physics/mcm/rider-tick.js';
// One atomic initialization. Native output rows are never accepted here.
// Initial stack inheritance is retained; cross-call scratch writes are not yet
// fully projected, so callers must compare rather than assume world parity.
export function createWorldBikeRuntime(files,terrain,{throttle,brake}){
 const world=loadLiveWorldEntry(files),entry=world.entry;
 if(!Number.isInteger(entry.randomState)||!entry.randomAddress)throw Error('Missing world-entry RNG');
 const random=createMcmRandom(entry.randomState),first=world.bikes[0].artifacts;
 const ordered=loadLiveOrderedDispatch(first.bike,first.collision),bikes=new Map(),sharedAnimationChildren=new Map();let sharedParticles;
 for(const source of world.bikes){
  const {artifacts}=source,checkpoint=artifacts.bike,address=source.address;
  const stack=CapturedBytes.from(entry.stackHex,'hex').subarray(0,0xc00);
  stack.writeUInt32LE(address===entry.bikes[0]?0x459126:0x45915b,0xbf8);stack.writeUInt32LE(entry.dtBits,0xbfc);
  for(const offset of [0x1c,0x2c,0x30])stack.writeUInt32LE(0,offset);
  const body=CapturedBytes.from(checkpoint.blocks.find(b=>b.address===address).hex,'hex');
  const row={phase:'before-update',pass:0,playerFrame:0,bike:address.toString(16),stateHex:body.toString('hex'),stackHex:stack.toString('hex'),stackAddress:entry.stackAddress.toString(16).padStart(8,'0'),frameBits:entry.dtBits,dtBits:stack.readUInt32LE(0x10),steps:stack.readUInt32LE(0x20),randomState:entry.randomState,...artifacts.effects};
  const loaded=loadLiveFrameBootstrap({checkpoint,animations:artifacts.animations,environment:artifacts.environment,collision:artifacts.collision,aiEnvironment:artifacts.aiEnvironment,row,terrain,throttle,brake,sharedWorld:ordered,sharedOrdered:ordered,sharedRandom:random,sharedAnimationChildren}),c=loaded.context;
  const projection='aiController' in c?c.aiController:connectMcmRetainedBikeBody(c,new DataView(body.buffer,body.byteOffset,body.length));
  const external=connectLiveRiderTick({ordered,bikeAddress:address,visuals:loaded.visuals,assets:loaded.animation.assets,animation:c.frameRider.riderAnimation,child:artifacts.child,terrain,sharedParticles});
  if(!sharedParticles)sharedParticles={address:artifacts.child.poolAddress,pool:external.pool,poolBytes:external.poolBytes,particleBytes:external.particleBytes,particleStride:external.particleStride,stableParticleOrder:external.stableParticleOrder};
  const rider=external.context.rider;
  for(const [key,field]of [['extentScale','fieldf8'],['field138','field138'],['field144','field144'],['contactClass','field154'],['selected','selected'],['eventKind','kind']])Object.defineProperty(rider,key,{get:()=>c.rider[field],set:value=>{c.rider[field]=value;}});
  Object.defineProperty(external.context,'selectedRecord',{get:()=>{const token=c.rider.selected[0],record=loaded.animation.assets.records.find(a=>a.token===token);if(token&&!record)throw Error('Missing retained rider animation');return record;}});
  const scenePosition=connectLiveSceneRiderPosition(loaded,{checkpoint,aiEnvironment:artifacts.aiEnvironment});
  bikes.set(address,{loaded,projection,external,scenePosition});
 }
 const audio=files['world-audio-0.json']?connectWorldCollisionAudio(files,world,ordered,random):null;let playerUpdates=0,pendingCamera=null;
 const meshes=files['world-mesh-0.jsonl']?connectWorldMeshes(files,world,bikes):null;
 return {world,ordered,random,bikes,meshes,audio,particles:sharedParticles,
  setFrameCamera(address,position){pendingCamera={address,position:[...position]};},
  setParticleBoundaryWords(address,words){
   if(!Array.isArray(words)||words.length!==2||!words.every(v=>Number.isInteger(v)&&v>=0&&v<=0xffffffff))throw Error('Invalid particle boundary input');
   const bike=bikes.get(address);if(!bike)throw Error('Unknown particle boundary bike');bike.external.context.particleBoundaryWords=[...words];
  },
  setFrameInput(address,input){
   const bike=bikes.get(address);if(!bike)throw Error('Unknown world input bike');
   for(const key of ['steerBits','analogBits','longitudinalBits'])if(!Number.isInteger(input[key])||input[key]<0||input[key]>0xffffffff||!Number.isFinite(new Float32Array(Uint32Array.of(input[key]).buffer)[0]))throw Error('Invalid world frame input');
   if(typeof input.devicePresent!=='boolean'||(input.devicePresent?(!Number.isInteger(input.deviceKind)||!Number.isInteger(input.deviceByte)||input.deviceByte<0||input.deviceByte>255):(input.deviceKind!==null||input.deviceByte!==null)))throw Error('Invalid world input device');
   bike.loaded.input={...input};
  },
  setPlayerInput({throttle,brake=0}){
   if(![0,1].includes(throttle)||![0,1].includes(brake))throw Error('Digital world controls must be zero or one');
   const c=bikes.get(world.entry.bikes[0]).loaded.context;if(c.bike.field614)throw Error('World player is AI controlled');
   c.engineEntry.input.throttleResponses[0]=throttle;c.engineEntry.input.brakeResponses[0]=brake;
  },
  stepBike(address,delta,observe){if(address===world.entry.bikes[0]){if(playerUpdates++>0)audio?.invalidateCamera();if(pendingCamera){audio?.setCamera(pendingCamera.address,pendingCamera.position);pendingCamera=null;}}const b=bikes.get(address);if(!b)throw Error('Unknown world bike');return advanceMcmRetainedFrame(b.loaded.context,{delta,mode:b.loaded.mode,input:b.loaded.input},observe);},
  stepRider(address,delta){const b=bikes.get(address);if(!b)throw Error('Unknown world rider');try{return advanceMcmRiderTick(b.external.context,delta);}finally{b.external.context.particleBoundaryWords=undefined;}}
 };
}
