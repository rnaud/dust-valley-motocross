import {loadLiveCollisionDispatch} from './live-collision-dispatch.mjs';
import {primaryMcmCollision,secondaryMcmCollision} from '../../src/physics/mcm/collision-callback.js';
import {respondMcmRiderCrashContact,respondMcmRiderSecondary} from '../../src/physics/mcm/rider-collision-response.js';
export function loadLiveOrderedDispatch(checkpoint,observation,options){
 if(!observation.bikeCallbackGatesCaptured||!observation.notificationGatesCaptured||!observation.riderResponseCaptured||!observation.transformsCaptured)throw Error('Ordered dispatch dependencies not captured');
 const w=loadLiveCollisionDispatch(checkpoint,observation,options),m=w.memory,trace=[];
 for(const a of w.actors.values()){
  const u=o=>m.u32(a.address+o),f=o=>m.f32(a.address+o),v=(o,n=3)=>Array.from({length:n},(_,i)=>f(o+i*4));
  if(a.kind==='bike'){
   for(const [key,offset] of [['field8a8',0x8a8],['field618',0x618],['field8ac',0x8ac]])a[key]=u(offset);
   for(const [key,offset] of [['heading',0x4e0],['restitution',0x5e0],['speed',0x6a4],['field888',0x888]])a[key]=f(offset);
   a.scratch540=v(0x540);a.field654=v(0x654);
  }else{
   Object.assign(a,{matrix:v(0xb8,16),center:v(0xa0),extents:v(0xac),extentScale:f(0xf8),contactClass:u(0x154)});
   if(u(0x158)!==a.bike.proxyAddress)throw Error('Rider proxy differs');
  }
 }
 const notify=b=>{if(b.notification.player!==b.address||b.state844)return;throw Error('Active collision audio not captured');};
 for(const o of w.objects){
  const actor=w.actors.get(o.ownerAddress);
  const context=()=>{const other=w.actors.get(o.other.ownerAddress);return {bike:actor,other:other.kind==='bike'?other:other.bike,collision:o,collisionType:o.other.collisionClass,tag:w.tag,proxy:actor.riderTransform,grid:w.grid,gridEnabled:w.enabled,notify};};
  const callback=address=>{
   if(!address)return undefined;
   return ()=>{
    const kind=address===0x49e490?0:address===0x49e610?1:address===0x40bb20?2:address===0x40bb30?3:-1;
    if(kind<0)throw Error(`Unsupported live callback 0x${address.toString(16)}`);
    if(trace.length>=128)throw Error('Callback trace limit');trace.push([actor.address,kind]);
    if(kind===0)primaryMcmCollision(context());
    else if(kind===1)secondaryMcmCollision(context());
    else if(kind===2){const other=w.actors.get(o.other.ownerAddress);respondMcmRiderCrashContact({rider:actor,collision:o,proxy:actor.bike.riderTransform,grid:w.grid,gridEnabled:w.enabled,...w.riderResponse,otherVelocity:other.velocity});}
    else respondMcmRiderSecondary(actor,o);
   };
  };
  o.onPrimary=callback(o.callbackAddresses[0]);o.onSecondary=callback(o.callbackAddresses[1]);
 }
 return {...w,trace};
}
