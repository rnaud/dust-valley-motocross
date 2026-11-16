// Original 0x4205e0. Detached nodes retain their own links and parent pointer.
export function unlinkMcmActor(node){
 if(node.previous)node.previous.next=node.next;
 if(node.next)node.next.previous=node.previous;
 if(node.parent?.first===node)node.parent.first=node.next;
}
// Complete 0x420760 traversal. Actor methods and device/clock calls are explicit
// boundaries. Read the next link after update, but before a removal destructor.
export function tickMcmActorChildren(parent,delta,services){
 let node=parent.first;
 while(node){
  while(node?.removed){
   unlinkMcmActor(node);const removed=node;node=node.next;services.destroy(removed);
  }
  if(!node)break;
  if(node.enabled&&!node.paused){
   services.update(node,delta);
   const owner=parent.owner;
   if(owner&&owner.world.gate){
    const world=owner.world;
    const flag=(!owner.device||owner.device.enabled)&&!world.flag?0:1;
    world.gate=services.poll(world.display,0,flag)>>>0?1:0;
    // The native callback may replace the owner/world pointer.
    if(!parent.owner.world.gate){
     const now=services.clock()>>>0;
     parent.owner.world.elapsed=(now-parent.owner.world.last)>>>0;
     parent.owner.world.last=now;
     const current=parent.owner.world;
     if((current.maximum|0)<(current.elapsed|0))current.maximum=current.elapsed;
    }
   }
  }
  node=node.next;
 }
 return 1;
}
