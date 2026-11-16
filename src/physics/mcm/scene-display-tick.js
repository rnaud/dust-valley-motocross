import {mcmAdd,mcmDivide,mcmMultiply} from './x87-arithmetic.js';
// Original 423b50. Child, refresh and display calls may change shared state;
// reads after those calls deliberately go back through the memory interface.
export function tickMcmSceneDisplay(address,delta,memory,services){
 const {u32,f32,put32,putFloat}=memory;
 const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error('Unconnected scene display service: '+name);return services[name](...args);};
 invoke('children',address,delta);
 putFloat(address+0x100,mcmAdd(f32(address+0x100),Math.fround(delta)));
 put32(0x4e2ef4,(u32(0x4e2ef4)+1)>>>0);
 if((u32(address+0x100)|0)>=0x3f000000){
  if(u32(u32(0x4e4fb4)+0x6f4))invoke('refresh',address);
  putFloat(0x4e2ef8,mcmMultiply(mcmDivide(f32(address+0x100),u32(0x4e2ef4)|0),1000));
  put32(address+0x100,0);put32(0x4e2ef4,0);
 }
 if(u32(0x4e2ef0)){
  invoke('rectangle',address,[0,0,128,128]);invoke('map',address);
 }else{
  for(let i=0;i<(u32(address+0x260)|0);i++){
   const bike=u32(address+0x234+i*4);
   const selected=u32(u32(bike+0x434)+0x12c)||(bike===u32(u32(address+0xf8)+0x30)&&bike===u32(u32(address+0xfc)+0x1ec));
   invoke('visibility',u32(address+0x264+i*4),selected?0x10:0x14);
  }
 }
 return 1;
}
