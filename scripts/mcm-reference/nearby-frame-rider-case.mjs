import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';
import {updateMcmFrameRider} from '../../src/physics/mcm/frame-rider.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function evaluateNearbyFrameRider(c){
 const nodes=[];
 for(let o=0;o<2;o++){
  const group=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
  if(o)for(const n of group)for(let k=0;k<3;k++){n.local[12+k]=f(n.local[12+k]+10);n.world[12+k]=f(n.world[12+k]+20);}
  group[0].parent=group[c.targetParent];group[c.targetParent].firstChild=group[0];
  if(o?c.riderParent:c.bodyParent){group[1].parent=group[2];group[1].nextSibling=group[2].firstChild;group[2].firstChild=group[1];}
  nodes.push(...group);
 }
 const tables=[[],[]];tables.forEach((table,o)=>table[c.componentIndex]={node:nodes[o*3],positionEnabled:c.positionEnabled});
 const children=[],records=[];
 for(let r=0;r<21;r++){
  const frames=[];
  for(let j=0;j<8;j++){
   const list=Array.from({length:2},(_,k)=>{
    const n=(r*8+j)*3+k;
    return {componentIndex:c.componentIndex,local:(c.local+r+j+k)%2,
     forward:c.forward.map((v,a)=>f(v+n*.125*(a+1))),up:c.up.map((v,a)=>f(v-n*.0625*(a+1))),position:c.position.map((v,a)=>f(v+n*.25*(a+1)))};
   });
   if(c.frameCount%2===0)list[0].next=list[1];children.push(...list);
   frames.push({index:j,firstChild:(c.childMask>>(j%2))&1?list[0]:null,
    boundsMin:c.position.map((v,k)=>f(v+(r*8+j)*(k+1))),boundsMax:c.position.map((v,k)=>f(v+(r*8+j)*(k+4)))});
  }
  for(let j=0;j<c.frameCount-1;j++)frames[j].next=frames[j+1];
  records.push({frameCount:c.frameCount,firstFrame:frames[0]});
 }
 const objects=[0,1].map(o=>({record:records[0],frame:records[0].firstFrame,boundsMin:[100+o*10,101+o*10,102+o*10],boundsMax:[103+o*10,104+o*10,105+o*10]}));
 const b={pose:c.pose,weight:c.weight,nextPose:c.nextPose,fraction:c.fraction,secondaryWeight:c.secondaryWeight,enabled:c.enabled,speed:c.speedBits===undefined?c.speed:bitsFloat(c.speedBits)};
 Object.assign(b,{state:0,fieldbfc:c.fieldbfc,field710:1,animation:255,active:c.active,returning:c.returning,lean:bitsFloat(c.leanBits),progress:bitsFloat(c.progressBits),angle:c.nearbyAngle,heading:c.heading,position:c.bikePosition});
 const applyBike=child=>applyMcmAnimationChild(nodes[1],tables[0],child),applyRider=child=>applyMcmAnimationChild(nodes[4],tables[1],child);
 const output=[];
 for(let step=0;step<4;step++){
 const context={bike:b,records,bikeAnimation:objects[0],riderAnimation:objects[1],applyBike,applyRider,bodyNode:nodes[1],riderBodyNode:nodes[4],target:{position:c.targetPosition}};
 updateMcmFrameRider(context,c.delta);
 output.push(...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),b.pose>>>0,floatBits(b.weight),b.nextPose>>>0,floatBits(b.fraction),floatBits(b.secondaryWeight),b.enabled>>>0,floatBits(b.speed),c.state>>>0,c.fieldbfc>>>0,...objects.flatMap(o=>[records.indexOf(o.record),o.frame.index,...[...o.boundsMin,...o.boundsMax].map(floatBits)]),...children.flatMap(child=>[...child.forward,...child.up,...child.position].map(floatBits)),b.field710,b.animation,b.active,b.returning,floatBits(b.lean),floatBits(b.progress),floatBits(b.angle));
 }
 return output;
}
