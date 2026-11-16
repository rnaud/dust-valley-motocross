// Original 426af0. Device calls remain explicit; this preserves wrapper gates.
export function playMcmSound(world,sound,menuSensitive,restart,loop,device){
 if(!world.enabled||(!world.reactionsEnabled&&menuSensitive)||!sound)return;
 if(restart)device.stop(sound,1);
 device.play(sound,0,loop);
}
// Original 401cf0, walking the group's linked list in native order.
export function stopMcmSoundGroup(first,reset,device){
 for(let node=first;node;node=node.next){
  if(!node.buffer)continue;
  const {result,status}=device.status(node.buffer);
  if(result){device.error(result,0x4e13f4,111);return 0;}
  if((status&1)&&!device.stop(node.handle,reset))return 0;
 }
 return 1;
}
