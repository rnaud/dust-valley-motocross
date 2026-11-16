import {mcmAdd} from './x87-arithmetic.js';
// Original 4253e0 and 425730. Children run first. At most one expired item
// is removed; the (possibly different) head then receives this frame's delta.
export function tickMcmSceneQueue(address,delta,memory,services){
 if(typeof services.children!=='function')throw Error('Unconnected scene queue children');
 services.children(address,delta);
 let head=memory.u32(address+0x54);
 if(head){
  const limit=memory.f32(head+0x80),elapsed=memory.f32(head+0x84);
  if(limit<elapsed||Number.isNaN(limit)||Number.isNaN(elapsed)){
   if(typeof services.free!=='function')throw Error('Unconnected scene queue free');
   memory.put32(address+0x54,memory.u32(head+0x88));
   services.free(head);
  }
  head=memory.u32(address+0x54);
  if(head)memory.putFloat(head+0x84,mcmAdd(memory.f32(head+0x84),Math.fround(delta)));
 }
 return 1;
}
