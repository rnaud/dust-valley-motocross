import {setupMcmTerrainView} from './terrain-view-setup.js';
// Original 4125b0 orchestration. Traversal/node services remain mandatory.
// Debug text emission is separate; no platform timing or output is invented.
export function prepareMcmTerrain(address,view,cameraAddress,camera,mode,memory,services){
 const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error('Unconnected terrain preparation service: '+name);return services[name](...args);};
 const clock=()=>{const value=invoke('clock');if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('Invalid terrain preparation clock');return value;};
 const u=o=>view.getUint32(o,true),put=(o,v)=>view.setUint32(o,v>>>0,true);
 const started=clock();memory.put32(0x4ee04c,0);memory.put32(0x4ee050,0);
 const changed=u(0x54)!==(mode>>>0);setupMcmTerrainView(view,camera,mode);
 let root=u(0x44);
 invoke('traverse',root,u(0x3c),cameraAddress+0xb0,root+0x1ec,root+0x1f8,0,0,16,0,0);
 put(0xc0,u(0xc0)+1);put(0x9ec,clock()-started);
 const updateStart=clock();invoke('update',u(0x44),changed);put(0x9e4,clock()-updateStart);
 if(u(0x7c)){invoke('optionalFirst',u(0x44));invoke('optionalSecond',u(0x44));}
 const emitStart=clock();invoke('emit',u(0x44),0,0,16,0);put(0x9e8,clock()-emitStart);
 clock();clock();put(0xb8,clock()-started);
 if(memory.u32(memory.u32(0x4e4fb4)+0x2e4)){
  const count=(memory.u32(0x4e238c)+1)>>>0;memory.put32(0x4e238c,count);
  if(count===10){memory.put32(0x4e238c,0);invoke('debug',address);}
 }
}
