// Original 411000. Time is supplied by the platform; terrain preparation is a
// separate mandatory service (4125b0), not an assumed no-op.
export function tickMcmTerrainScene(address,memory,services){
 const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error('Unconnected terrain scene service: '+name);return services[name](...args);};
 const clock=()=>{const value=invoke('clock');if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('Invalid terrain clock result');return value;};
 const start=clock();
 const owner=memory.u32(address+0x1c),mode=memory.u32(address+0x958),pending=memory.u32(address+0x95c),camera=memory.u32(owner+0x2c);
 invoke('prepare',address,pending,camera,mode);
 memory.put32(address+0x95c,0);
 const end=clock();memory.put32(address+0x9f0,(end-start)>>>0);
 return 1;
}
