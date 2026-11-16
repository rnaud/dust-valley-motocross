import {tickMcmWorldActors} from '../../src/physics/mcm/world-actors-tick.js';
// Connect the native world ordering to retained bike physics. Presentation and
// child actors remain explicit services; missing active services never no-op.
export function connectWorldActorRuntime(runtime){
 const {world,bikes}=runtime,c=world.context,refresh=world.entry.refreshDevice;
 if(!refresh||!['controller','address','kind'].every(k=>Number.isInteger(refresh[k])&&refresh[k]>=0&&refresh[k]<=0xffffffff))throw Error('Missing world refresh device observation');
 const player=bikes.get(c.player.address);
 if(refresh.controller!==player.loaded.environment.controllerAddress)throw Error('World refresh controller differs');
 if(!refresh.address&&refresh.kind)throw Error('Refresh kind without device');
 for(const source of world.bikes){
  const state=bikes.get(source.address).loaded.context.bike;
  Object.defineProperty(source,'position504',{configurable:true,get:()=>state.referencePosition});
  Object.defineProperty(source,'excluded',{configurable:true,get:()=>state.fieldc30});
 }
 return (delta,services)=>{
  const invoke=(name,...args)=>{
   if(typeof services[name]!=='function')throw Error(`Unconnected world service: ${name}`);
   return services[name](...args);
  };
  return tickMcmWorldActors(c,delta,{
   physics:(bike,dt)=>invoke('physics',bike.address,dt),
   // 4b2240 returns at 4b2256 when the world has no network session.
   presentation:(bike,dt)=>{if(c.world.network)invoke('networkPresentation',bike.address,dt);},
   // 4b6750 only drives device kind 3 while the player is not crashed.
   refresh:()=>{if(refresh.address&&refresh.kind===3&&!player.loaded.context.bike.field844)invoke('forceFeedback',c.player.address);},
   select:(context,index)=>invoke('select',context,index),
   localIdentity:network=>invoke('localIdentity',network),
   remote:(bike,dt)=>invoke('remote',bike.address,dt),
   race:(bike,dt)=>invoke('race',bike.address,dt),
   raceWorld:context=>invoke('raceWorld',context),
   marker:(marker,position)=>invoke('marker',marker,position),
   children:(_context,dt)=>invoke('children',dt)
  });
 };
}
