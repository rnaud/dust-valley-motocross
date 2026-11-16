import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {connectLiveRiderTick} from './live-rider-tick.mjs';
import {connectLiveSceneRiderPosition} from './live-scene-rider-position.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {advanceMcmRiderTick} from '../../src/physics/mcm/rider-tick.js';
import {tickMcmParticlePool} from '../../src/physics/mcm/particle-pool-tick.js';
import {tickMcmDust} from '../../src/physics/mcm/dust-tick.js';
import {tickMcmSpray} from '../../src/physics/mcm/spray-tick.js';
import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';

// One initialization, shared identities, and explicit world update ordering.
// No observed output is accepted by the stepping methods or copied into state.
export function createCapturedFrameRuntime(inputs,row,child){
 const loaded=loadLiveFrameBootstrap({...inputs,row:row}),c=loaded.context;
 const external=connectLiveRiderTick({ordered:loaded.ordered,bikeAddress:inputs.checkpoint.bikeAddress,visuals:loaded.visuals,assets:loaded.animation.assets,animation:c.frameRider.riderAnimation,child:child,terrain:inputs.terrain}),r=external.context.rider;
 if(child.rider!==r.address)throw Error('Retained rider ownership differs');
 for(const [key,field]of [['extentScale','fieldf8'],['field138','field138'],['field144','field144'],['contactClass','field154'],['selected','selected'],['eventKind','kind']])Object.defineProperty(r,key,{get:()=>c.rider[field],set:value=>{c.rider[field]=value;}});
 Object.defineProperty(external.context,'selectedRecord',{get:()=>{const token=c.rider.selected[0],record=loaded.animation.assets.records.find(a=>a.token===token);if(token&&!record)throw Error('Missing retained selected animation');return record;}});
 const scenePosition=connectLiveSceneRiderPosition(loaded,inputs);
 const sprayBytes=child.sprayHex?CapturedBytes.from(child.sprayHex,'hex'):null;
 if(sprayBytes){
  const emitter=c.frameEffects.emitters[1];
  if(sprayBytes.length!==0x614||child.sprayAddress!==emitter.address||!sprayBytes.subarray(0,0x84).equals(emitter.bytes))throw Error('Initial spray state differs');
 }
 return {loaded,external,scenePosition,
  sprayState(){
   if(!sprayBytes)throw Error('Missing initial spray tables');
   // Frame effects owns the shared prefix; the table/index tail stays retained.
   sprayBytes.set(c.frameEffects.emitters[1].bytes,0);return sprayBytes;
  },
  // 0x4b7a00 copies local +0x84 verbatim; it does not resolve world +0xc4.
  // 0x44f870 copies animated actor +0x218/+0x224, not physics-rider bounds.
  renderSources(){
   return ['bike','rider'].map(kind=>{
    const visual=loaded.visuals[kind],animation=c.frameRider[kind+'Animation'];
    return {actor:visual.address,node:visual.bodyNode.address,
     local:Float32Array.from(visual.bodyNode.local),
     center:Float32Array.from(animation.boundsMin),extent:Float32Array.from(animation.boundsMax)};
   });
  },
  stepBike({delta,throttle,brake,steerBits},observe){
   if(!Number.isFinite(delta)||delta<=0||![0,1].includes(throttle))throw Error('Invalid bike frame input');
   if(brake!==undefined&&![0,1].includes(brake))throw Error('Invalid bike brake input');
   if(steerBits!==undefined&&(!Number.isInteger(steerBits)||steerBits<0||steerBits>0xffffffff||!Number.isFinite(bitsFloat(steerBits))))throw Error('Invalid bike steering input');
   c.engineEntry.input.throttleResponses[0]=throttle;
   if(brake!==undefined)c.engineEntry.input.brakeResponses[0]=brake;
   if(steerBits!==undefined)loaded.input.steerBits=steerBits;
   return advanceMcmRetainedFrame(c,{delta,mode:loaded.mode,input:loaded.input},observe);
  },
  stepRider({delta,paused}){
   external.context.paused=paused;
   return advanceMcmRiderTick(external.context,delta);
  },
  stepPool({delta,paused}){
   if(!external.pool)throw Error('Missing captured particle pool');
   return tickMcmParticlePool(external.pool,{dt:delta,paused});
  },
  stepDust({delta,paused}){
   const emitter=c.frameEffects.emitters[0];
   return tickMcmDust(emitter.bytes.view(0,0x84),{dt:delta,paused,pool:external.pool});
  },
  stepSpray({delta,paused}){
   const bytes=this.sprayState(),result=tickMcmSpray(bytes.view(0,bytes.length),{dt:delta,paused,pool:external.pool});
   c.frameEffects.emitters[1].bytes.set(bytes.subarray(0,0x84));return result;
  }
 };
}
