import {tickMcmActorChildren} from '../../src/physics/mcm/actor-children-tick.js';
// Dispatch from retained actor links and native virtual-method identities.
// Unknown custom methods are explicit services, never generic recursion.
export function connectWorldChildRuntime(runtime){
 const {world,bikes}=runtime,{tree}=world,root=tree.nodes.get(world.entry.actor);
 if(!root||root.update!==0x4590b0)throw Error('Missing world child root');
 const riders=new Map([...bikes].map(([address,bike])=>[bike.external.context.rider.address,address]));
 const owners=new Map();
 for(const [address,raw]of tree.owners){
  if(raw.gate)throw Error('Uncaptured active world child polling state');
  owners.set(address,{world:{gate:raw.gate},device:raw.device?{enabled:raw.deviceEnabled}:null});
 }
 for(const node of tree.nodes.values())node.owner=node.ownerAddress?owners.get(node.ownerAddress):null;
 return (delta,services)=>{
  const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error(`Unconnected child service: ${name}`);return services[name](...args);};
  const callbacks={
   update(node,dt){
    if(node.update===0x420760)return tickMcmActorChildren(node,dt,callbacks);
    if(node.update===0x40e990){
     const bike=riders.get(node.address);if(bike===undefined)throw Error('Uncaptured rider actor');
     // The recovered rider tick owns its particle-child traversal.
     return invoke('rider',bike,dt);
    }
    return invoke('actor',node,dt,()=>tickMcmActorChildren(node,dt,callbacks));
   },
   destroy:node=>invoke('destroy',node),poll:()=>{throw Error('Uncaptured world child polling state');},clock:()=>{throw Error('Uncaptured world child clock');}
  };
  return tickMcmActorChildren(root,delta,callbacks);
 };
}
