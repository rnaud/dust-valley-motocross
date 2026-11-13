import {seekMcmInteractionAnimations} from '../../src/physics/mcm/nearby-transition.js';
import {updateMcmRiderStep} from '../../src/physics/mcm/rider-step.js';
import {queryMcmBikeInput} from '../../src/physics/mcm/bike-input.js';
export function runRiderStepCase(c){
 const s=c.setup,self={position:c.position},other={position:c.target};
 const rider={boundsMin:[0,0,0],boundsMax:[0,0,0]};
 const queries=[];
 const t=updateMcmRiderStep({...c,control:c.riderControl,query(action){
 const result=queryMcmBikeInput({...c.riderControl,povPresent:0,presentMask:1,action,option:0,responses:[c.riderControl.buttons[[9,6,7].indexOf(action)],0,0,0,0,0]});
 if(result.polled.length)queries.push(action);return result.value;
 },nearby:{self,world:{playerCount:1,otherCount:1,player:self,others:[c.otherPresent?other:null,null]},heading:s.field4e0,angle:c.angle4f0,lean:c.accel,progress:c.decel,field824:c.counter,field820:c.field820,field710:c.field710,fieldb4c:c.fieldb4c,animation:c.animation,time:c.time,
 seekAnimations(r){
  r.boundsChildren.forEach((child,j)=>child.next=r.boundsChildren[j+1]);
  const frameCount=1+c.trickIndex%8;
  const makeRecord=base=>{
   const frames=Array.from({length:frameCount},(_,j)=>({index:j,boundsMin:base.map((v,k)=>Math.fround(v+j*(k+1))),boundsMax:base.map((v,k)=>Math.fround(v+j*(k+4))),firstChild:j%3?r.boundsChildren[0]:null}));
   frames.forEach((frame,j)=>frame.next=frames[j+1]);return {frameCount,firstFrame:frames[0]};
  };
  seekMcmInteractionAnimations(r,rider,makeRecord(s.boundsMin),makeRecord(s.boundsMax),[c.trickIndex&1,(c.trickIndex>>1)&1]);
 }}});
 t.queries=queries;t.inputCalls=queries.length;
 if(t.accepted){t.bikeAnimation[1]=t.riderAnimation[1]=1;t.bikeAnimation[2]=t.frame.index+1;t.riderAnimation[2]=rider.frame.index+1;}
 t.riderBounds=[...rider.boundsMin,...rider.boundsMax];
 return t;
}
