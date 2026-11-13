import {mcmSqrt} from './math.js';
const f=Math.fround;
// Original 0x42b870. Pair table uses a fixed stride of 60 in memory.
export function prepareMcmCollisionPairs(manager,id){
 for(const entry of manager.objects[id].entries){
  if(!entry.active)continue;
  for(let node=manager.cells[entry.cell].next;node;node=node.next){
   const other=node.owner;
   if(manager.pairs[id][other]!==3)manager.pairs[id][other]=id===other?1:2;
  }
 }
}
// Original type 0/type 0 primitive 0x42c0e0. Depth alone is updated on hit.
export function testMcmSpherePair(manager,a,b){
 const x=b.worldCenter[0]-a.worldCenter[0],y=b.worldCenter[1]-a.worldCenter[1],z=b.worldCenter[2]-a.worldCenter[2];
 const distance=f(((y*y+x*x)+z*z)*f(.2)),radius=a.radius+b.radius;
 if(!(radius*radius>distance))return false;
 manager.depth=f((a.radius-mcmSqrt(distance))+b.radius);return true;
}
export function testMcmCollisionPair(manager,aId,bId,testPrimitive){
 manager.currentA=aId;manager.currentB=bId;
 if(manager.pairs[aId][bId]!==2)return false;
 const hit=testPrimitive(manager,manager.objects[aId],manager.objects[bId]);
 manager.pairs[aId][bId]=manager.pairs[bId][aId]=hit?0:1;
 return hit;
}
// Original 0x42ccc0. Callbacks can mutate state, so traverse the live lists.
export function dispatchMcmCollisions(manager,id,testPrimitive){
 if(!manager.objects[id].enabled||!manager.enabled)return;
 prepareMcmCollisionPairs(manager,id);
 for(let i=0;i<manager.objects[id].entries.length;i++){
  const entry=manager.objects[id].entries[i];if(!entry.active)continue;
  for(let node=manager.cells[entry.cell].next;node;node=node.next){
   const otherId=node.owner;if(otherId===id||!manager.objects[otherId].enabled)continue;
   if(!testMcmCollisionPair(manager,id,otherId,testPrimitive))continue;
   let a=manager.objects[id],b=manager.objects[otherId];
   a.other=b;a.contactD8=[...manager.contactD8];a.contactE4=[...manager.contactE4];a.contactCC=[...manager.contactCC];
   b.other=a;b.contactE4=[...manager.otherE4];b.contactCC=[...manager.contactCC];
   a=manager.objects[id];a.onPrimary?.(a);
   b=manager.objects[otherId];b.onSecondary?.(b);
  }
 }
}
