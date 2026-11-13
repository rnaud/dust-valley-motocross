import {updateMcmNormalEventJoinSubstep} from './normal-event-join-substep.js';
import {updateMcmRiderStep} from './rider-step.js';
import {queryMcmBikeInput} from './bike-input.js';
import {seekMcmInteractionAnimations} from './nearby-transition.js';

// Real rider-update body, sharing the preceding simulation's transform graph.
export function updateMcmNormalRiderSubstep(c){
 const result=updateMcmNormalEventJoinSubstep(c),s=c.normalRider,e=c.normalEventSetup;
 s.queries=[];
 if(!c.normalEventJoin.called)return result;
 const control={enabled:c.normalControl.flag820,control:c.normalControl.yaw,blend:c.normalControl.field730,positivePeak:s.positivePeak,negativePeak:s.negativePeak,envelope:e.envelope,nominalDt:c.linearIntegration.field8cc,axis:c.componentAngle,limit:c.componentLimit,dt:c.dt,field4bc:c.field4bc,lowerHeight:s.lowerHeight,upperHeight:s.upperHeight,poseSpeed:c.rearMotion.forwardMagnitude,pose:s.pose,weight:s.weight,nextPose:s.nextPose,secondaryWeight:s.secondaryWeight,height:c.normalEventJoin.height,steer:c.normalEventJoin.control,state:c.state844,field710:c.leanDisabled,fieldbfc:s.fieldbfc,ai:c.drive.ai,secondaryControl:s.secondaryControl,height0:c.heights[0],height1:c.heights[1],flags:c.normalControl.flags,fieldb4c:c.fieldb4c,directionX:s.directionX,directionY:c.riderLean};
 const setup={...e,graph:{target:c.bodyNode,source:c.nodes[e.sourceIndex],components:e.children,boundsChildren:e.boundsChildren.slice(0,e.childCount)},scratch540:c.offset,scratch54c:c.normal};
 const self={position:c.bodyPosition},other={position:s.otherPosition},rider={boundsMin:s.riderBounds.slice(0,3),boundsMax:s.riderBounds.slice(3)};
 const r=updateMcmRiderStep({control,setup,animation:c.normalEventDecision.animation,awardBase:s.awardBase,bikeAnimation:s.bikeAnimation,riderAnimation:s.riderAnimation,bikeAnimationRecords:s.bikeRecords,riderAnimationRecords:s.riderRecords,time:c.linearIntegration.field8cc,
  query(action){const q=queryMcmBikeInput({...control,povPresent:0,presentMask:1,action,option:0,responses:[s.buttons[[9,6,7].indexOf(action)],0,0,0,0,0]});if(q.polled.length)s.queries.push(action);return q.value;},
  nearby:{self,world:{playerCount:1,otherCount:1,player:self,others:[s.otherPresent?other:null,null]},heading:c.heading,angle:s.angle,lean:s.lean,progress:s.progress,field824:s.field824,
   seekAnimations(r){
    e.boundsChildren.forEach((child,j)=>child.next=j+1<e.childCount?e.boundsChildren[j+1]:null);
    const frameCount=1+s.frameMode%8;
    const makeRecord=base=>{const frames=Array.from({length:frameCount},(_,j)=>({index:j,boundsMin:base.map((v,k)=>Math.fround(v+j*(k+1))),boundsMax:base.map((v,k)=>Math.fround(v+j*(k+4))),firstChild:j%3?e.boundsChildren[0]:null}));frames.forEach((frame,j)=>frame.next=frames[j+1]);return {frameCount,firstFrame:frames[0]};};
    seekMcmInteractionAnimations(r,rider,makeRecord(e.boundsMin),makeRecord(e.boundsMax),[s.frameMode&1,(s.frameMode>>1)&1]);
   }
  }});
 c.normalControl.flag820=r.field820;c.normalControl.field730=r.blend;c.leanDisabled=r.field710;c.fieldb4c=r.fieldb4c;c.normalEventDecision.animation=r.animation;
 e.envelope=r.envelope;e.liveBoundsMin=r.boundsMin;e.liveBoundsMax=r.boundsMax;c.offset=r.scratch540;c.normal=r.scratch54c;
 for(const key of ['positivePeak','negativePeak','pose','weight','nextPose','secondaryWeight','awardBase','bikeAnimation','riderAnimation','angle','lean','progress','field824'])s[key]=r[key];
 if(r.nearbyVisited)s.nearbyPresent=+!!r.nearby;s.riderBounds=[...rider.boundsMin,...rider.boundsMax];
 if(r.accepted){s.bikeAnimation[1]=s.riderAnimation[1]=1;s.bikeAnimation[2]=r.frame.index+1;s.riderAnimation[2]=rider.frame.index+1;}
 return result;
}
