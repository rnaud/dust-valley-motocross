import {tickMcmActorChildren} from '../../src/physics/mcm/actor-children-tick.js';
import {tickMcmParticlePool} from '../../src/physics/mcm/particle-pool-tick.js';
// The child-walk inside original 481310. Camera switching/environment work
// before this walk and scene timer work afterward are not implemented here.
export function connectWorldSceneChildren(runtime,{queue=null,display=null}={}){
 const {tree,entry}=runtime.world,world=tree.nodes.get(entry.actor),pool=tree.nodes.get(runtime.particles.address),scene=world?.parent;
 if(!scene||scene.update!==0x481310||pool?.parent!==scene||pool.update!==0x43b200)throw Error('Missing shared scene/world/pool topology');
 for(const node of tree.nodes.values())if(node.ownerAddress&&!node.owner)throw Error('Scene actor owners are not connected');
 return (delta,services)=>{
  const trace=[];
  const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error(`Unconnected scene service: ${name}`);return services[name](...args);};
  const callbacks={update(node,dt){
   trace.push({address:node.address,update:node.update});
   if(display&&node.address===display.address)return display.step(dt,()=>tickMcmActorChildren(node,dt,callbacks));
   if(queue&&node.address===queue.address)return queue.step(dt,()=>tickMcmActorChildren(node,dt,callbacks));
   if(node===world)return invoke('world',dt);
   if(node===pool){
    invoke('beforePool',dt);
    tickMcmParticlePool(runtime.particles.pool,{dt,paused:runtime.world.context.world.paused});
    invoke('afterPool',dt);return 1;
   }
   // 429d90 forwards its delta unchanged to 420760 and returns that result.
   if(node.update===0x420760||node.update===0x429d90)return tickMcmActorChildren(node,dt,callbacks);
   return invoke('actor',node,dt);
  },destroy:node=>invoke('destroy',node),poll:()=>{throw Error('Uncaptured scene polling state');},clock:()=>{throw Error('Uncaptured scene clock');}};
  tickMcmActorChildren(scene,delta,callbacks);return trace;
 };
}
