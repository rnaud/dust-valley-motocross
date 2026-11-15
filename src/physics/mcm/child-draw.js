// Original 4206c0. Unlink, destruction and virtual draw effects belong to the
// callbacks. Observe next after unlink, but before destruction, as native does.
export function drawMcmChildren(parent,{unlink,destroy,draw}) {
  let child=parent.child;
  while(child){
    while(child?.removed){
      unlink(child);
      const removed=child;child=removed.next;
      destroy(removed);
    }
    if(!child)break;
    if(child.enabled&&!draw(child))return 0;
    child=child.next;
  }
  return 1;
}

// 467f40 locals/saves + virtual draw call; 467a90 locals/saves + scene call.
export function mcmSceneRootEntryEsp(worldEntryEsp){return (worldEntryEsp-0x10-4-0xb0-4)>>>0;}
