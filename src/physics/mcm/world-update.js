import {connectWorldActorRuntime} from '../../../scripts/mcm-reference/world-actor-runtime.mjs';
import {connectWorldChildRuntime} from '../../../scripts/mcm-reference/world-child-runtime.mjs';
import {connectWorldEmitterRuntime} from '../../../scripts/mcm-reference/world-emitter-runtime.mjs';
import {connectWorldMarkerRuntime} from '../../../scripts/mcm-reference/world-marker-runtime.mjs';
import {connectWorldHudRuntime} from '../../../scripts/mcm-reference/world-hud-runtime.mjs';

// Retained 4590b0 world update and its child traversal. Camera/scene/pool and
// drawing surround this call; they must not be replaced by observation rows.
export function connectMcmWorldUpdate(runtime,options={}){
 const schedule=connectWorldActorRuntime(runtime),walk=connectWorldChildRuntime(runtime);
 const emitters=options.emitters===undefined?connectWorldEmitterRuntime(runtime):options.emitters;
 const markers=options.markers===undefined?connectWorldMarkerRuntime(runtime):options.markers;
 const hud=options.hud===undefined?connectWorldHudRuntime(runtime):options.hud;
 const required=(services,name,...args)=>{
  if(typeof services[name]!=='function')throw Error(`Unconnected world update service: ${name}`);
  return services[name](...args);
 };
 const children=(delta,services={})=>{
  services.beforeChildren?.(delta);
  const result=walk(delta,{
   rider:(address,dt)=>{
    if(services.rider)return services.rider(address,dt);
    services.beforeRider?.(address,dt);const result=runtime.stepRider(address,dt);services.afterRider?.(address,dt,result);return result;
   },
   actor:(node,dt,traverse)=>{
    services.beforeActor?.(node,dt);
    if(markers?.step(node,dt,traverse)||hud?.step(node,dt,traverse))return;
    if(emitters?.step(node,dt,runtime.world.context.world.paused,(phase,state)=>services.observeEmitter?.(phase,state)))return;
    return required(services,'actor',node,dt,traverse);
   },destroy:node=>required(services,'destroy',node),
  });
  services.afterChildren?.(delta);return result;
 };
 return {emitters,markers,hud,children,step(delta,services={}){
  return schedule(delta,{
   ...services,
   physics:(address,dt)=>{
    if(services.physics)return services.physics(address,dt);
    services.beforeBike?.(address,dt);
    const result=runtime.stepBike(address,dt,(stage,context)=>services.observeBike?.(address,stage,context));
    if(result.status!=='returned')throw Error(`World bike stopped: ${result.status}`);
    services.afterBike?.(address,dt,result);return result;
   },
   marker:(marker,position)=>{
    if(services.marker)return services.marker(marker,position);
    if(!markers)throw Error('World marker runtime is not connected');
    markers.move(marker.address,position);services.afterMarker?.(marker,position);
   },
   children:dt=>services.children?services.children(dt):children(dt,services),
  });
 }};
}
