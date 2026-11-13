import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';
import {updateMcmTrickFrameRider} from '../../src/physics/mcm/trick-frame-rider.js';
import {queryMcmBikeInput} from '../../src/physics/mcm/bike-input.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function evaluateTrickFrameRider(c){
 const nodes=[];
 for(let o=0;o<2;o++){
  const group=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
  if(o)for(const n of group)for(let k=0;k<3;k++){n.local[12+k]=f(n.local[12+k]+10);n.world[12+k]=f(n.world[12+k]+20);}
  group[0].parent=group[c.targetParent];group[c.targetParent].firstChild=group[0];
  if(o?c.riderParent:c.bodyParent){group[1].parent=group[2];group[1].nextSibling=group[2].firstChild;group[2].firstChild=group[1];}
  nodes.push(...group);
 }
 const tables=[[],[]];tables.forEach((table,o)=>table[c.componentIndex]={node:nodes[o*3],positionEnabled:c.positionEnabled});
 const children=[],records=[],objects=[];
 for(let r=0;r<2;r++){
  const list=Array.from({length:2},(_,k)=>{
   const n=r*3+k;
   return {componentIndex:c.componentIndex,local:(c.local+r+k)%2,
    forward:c.forward.map((v,a)=>f(v+n*.125*(a+1))),up:c.up.map((v,a)=>f(v-n*.0625*(a+1))),position:c.position.map((v,a)=>f(v+n*.25*(a+1)))};
  });
  list[0].next=list[1];children.push(...list);
  const frames=Array.from({length:c.frameCount},(_,j)=>({index:j,firstChild:(c.childMask>>(j%2))&1?list[0]:null,
   boundsMin:c.position.map((v,k)=>f(v+(r*32+j)*(k+1))),boundsMax:c.position.map((v,k)=>f(v+(r*32+j)*(k+4)))}));
  for(let j=0;j<c.frameCount-1;j++)frames[j].next=frames[j+1];
  const record={frameCount:c.frameCount,firstFrame:frames[0],fps:c.fps,loop:c.loop};records.push(record);
  objects.push({record,frame:frames[c.initialFrame],displayedFrame:frames[0],previousFrame:frames.at(-1),
   stopped:(c.stoppedMask>>r)&1,remainder:c.remainder,blendFrame:frames[1],blendTime:c.blendTime,blendDuration:c.blendDuration,blending:(c.blendingMask>>r)&1,
   boundsMin:[100+r*10,101+r*10,102+r*10],boundsMax:[103+r*10,104+r*10,105+r*10]});
 }
 const b={ai:c.ai,secondaryControl:c.secondaryControl,animation:c.animation,elapsed:c.elapsed,holdTime:bitsFloat(c.holdTimeBits)};
 const applyBike=child=>applyMcmAnimationChild(nodes[1],tables[0],child),applyRider=child=>applyMcmAnimationChild(nodes[4],tables[1],child);
 const output=[];
 for(let step=0;step<4;step++){
  const queries=[];
  updateMcmTrickFrameRider({bike:b,bikeAnimation:objects[0],riderAnimation:objects[1],applyBike,applyRider,query(action){
   const result=queryMcmBikeInput({ai:b.ai,secondaryControl:b.secondaryControl,povPresent:0,presentMask:1,action,option:0,responses:[(c.buttons>>(step*2+action-6))&1,0,0,0,0,0]});
   if(result.polled.length)queries.push(action);return result.value;
  }},c.delta);
  output.push(...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),
   ...objects.flatMap((o,r)=>[o.stopped,floatBits(o.remainder),+(o.record===records[r]),o.frame.index,o.displayedFrame.index,o.previousFrame.index,floatBits(o.blendTime),o.blending,...[...o.boundsMin,...o.boundsMax].map(floatBits)]),
   ...children.flatMap(child=>[...child.forward,...child.up,...child.position].map(floatBits)),1,b.animation,floatBits(b.elapsed),floatBits(b.holdTime),queries.length,queries[0]||0,queries[1]||0);
 }
 return output;
}
