// Original 43e660. Camera and renderer pointers are read again after each
// service call, preserving changes made by those calls to the shared owner.
export function tickMcmSceneRenderer(address,memory,services){
 const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error('Unconnected scene renderer service: '+name);return services[name](...args);};
 if(memory.u32(address+0x20)){
  invoke('clip',memory.u32(memory.u32(address+0x1c)+0x2c),1,memory.f32(address+0x38));
  invoke('matrices',memory.u32(memory.u32(address+0x1c)+0x2c));
  const owner=memory.u32(address+0x1c),result=invoke('submit',memory.u32(owner+0xc),3,memory.u32(owner+0x2c)+0x30);
  if(!Number.isInteger(result))throw Error('Missing scene renderer result');
  if(result)invoke('error',result,0x4e4764,0x70);
 }
 return 1;
}
