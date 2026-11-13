import {startMcmAnimation} from '../../src/physics/mcm/animation-seek.js';
const f=Math.fround;
export function initializeResetFrameRiderAssets(c,input){
 const allChildren=[];
 const record=(count,id,token)=>{
  const frames=Array.from({length:count},(_,j)=>{
   const child={componentIndex:id<21?input.bounds.children[0].componentIndex:id%4,local:id<21?1:id%2,forward:[0,0,1],up:[0,1,0],position:[0,1,2].map(k=>f((id+j+k)*.125))};
   allChildren.push(child);
   return {index:j,token:j,firstChild:child,boundsMin:[0,1,2].map(k=>f((id+j+k)*.25)),boundsMax:[3,4,5].map(k=>f((id+j+k)*.25))};
  });
  for(let j=0;j<count-1;j++)frames[j].next=frames[j+1];
  return {token,firstFrame:frames[0],frameCount:count,loop:id>=21?(input.frameRider.trickLoop??1):1,fps:30};
 };
 const records=Array.from({length:21},(_,i)=>record(8,i,100+i));
 const tricks=Array.from({length:2},(_,o)=>Array.from({length:16},(_,i)=>record(32,o*16+i+21,i+1)));
 const objects=[0,1].map(o=>{
  const object={stopped:1,remainder:f(.003),displayedFrame:records[0].firstFrame,previousFrame:records[0].firstFrame,blendFrame:records[0].firstFrame,blendTime:0,blendDuration:f(.2),blending:0,field30:0};
  startMcmAnimation(object,records[0]);object.stopped=o&&input.frameRider.rawDelta===f(.04)?0:1;
  Object.defineProperties(object,{
   boundsMin:{get:()=>o?c.loopRider.riderBounds.slice(0,3):c.bike.boundsMin,set:v=>{if(o)c.loopRider.riderBounds.splice(0,3,...v);else c.bike.boundsMin=v;}},
   boundsMax:{get:()=>o?c.loopRider.riderBounds.slice(3):c.bike.boundsMax,set:v=>{if(o)c.loopRider.riderBounds.splice(3,3,...v);else c.bike.boundsMax=v;}}
  });
  return object;
 });
 records[14]=c.loopRider.nearbySetup.riderRecord;records[20]=c.loopRider.nearbySetup.bikeRecord;
 c.frameRider={positionFlags:input.parents.map(p=>+(p>=0)),records,tricks,bikeAnimation:objects[0],riderAnimation:objects[1],allChildren};
 c.loopRider.riderAnimation=[objects[1].stopped,100,0,0,0];
}
