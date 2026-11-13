import {applyMcmBikeRider} from './reset-rider.js';
import {queryMcmBikeInput} from './bike-input.js';
import {startMcmTrick} from './trick-start.js';
import {resetMcmEventOrientation} from './event-graph.js';
import {startMcmNearbyInteraction,seekMcmInteractionAnimations} from './nearby-transition.js';

// Execute the real rider paths reachable from the completed reset's second pass.
export function continueMcmResetLoopRider(c){
 const b=c.bike,p=c.contactPhase,s=c.loopRider;
 s.queries=[];s.trickIndex=-1;
 const setup={graph:{target:c.bodyNode,source:c.bodyNode,components:c.bounds.components,
  boundsChildren:c.bounds.children.slice(0,c.bounds.count)},boundsMin:c.bounds.min,boundsMax:c.bounds.max,
  envelope:c.effect,liveBoundsMin:b.boundsMin,liveBoundsMax:b.boundsMax,scratch540:b.offset,scratch54c:b.normal};
 const r=applyMcmBikeRider(c,{
  query(action){
   const q=queryMcmBikeInput({ai:b.field614,secondaryControl:b.field618,povPresent:0,presentMask:1,
    action,option:0,responses:[s.buttons[[9,6,7].indexOf(action)],0,0,0,0,0]});
   if(q.polled.length)s.queries.push(action);return q.value;
  },
  trick(r,trickIndex){
   s.trickIndex=trickIndex;s.animationFrame=s.bikeRecords[trickIndex];
   Object.assign(r,startMcmTrick({setup,trickIndex,field820:r.enabled,time:b.field8cc,
    bikeAnimationRecords:s.bikeRecords,riderAnimationRecords:s.riderRecords}));r.enabled=r.field820;
  },
  resetOrientation(r){Object.assign(r,setup.graph);resetMcmEventOrientation(r,setup);},
  nearby(r){
   const bikes=c.bikes.map(x=>({position:x.position,disabled:x.fieldc30})),self=bikes[0];
   const result=startMcmNearbyInteraction({setup,self,
    world:{disabled:c.enumerationDisabled,playerCount:c.playerCount,otherCount:c.aiCount,player:self,players:bikes.slice(0,c.playerCount),others:bikes.slice(c.playerCount)},
    field820:r.enabled,field710:r.field710,field824:b.field824,fieldb4c:r.fieldb4c,
    animation:b.field814&255,heading:b.field4e0,angle:b.field834,lean:b.field82c,progress:b.field830,time:b.field8cc,
    seekAnimations(result){
     const {bikeRecord,riderRecord,positionFlags}=s.nearbySetup;
     const rider={target:c.bodyNode};seekMcmInteractionAnimations(result,rider,bikeRecord,riderRecord,positionFlags);
     s.riderBounds=[...rider.boundsMin,...rider.boundsMax];
     result.bikeAnimation=[...s.bikeAnimation];result.riderAnimation=[...s.riderAnimation];
     result.bikeAnimation[1]=bikeRecord.token;result.riderAnimation[1]=riderRecord.token;
     result.bikeAnimation[2]=result.frame.token;result.riderAnimation[2]=rider.frame.token;s.animationFrame=result.frame.index;
    }
   });
   Object.assign(r,result);r.enabled=result.field820;
   b.field824=result.field824;b.field834=result.angle;b.field82c=result.lean;b.field830=result.progress;
   s.nearby=result.nearby;
  }
 });
 if(!r)return;
 if(r.animation!==undefined){b.field814=((b.field814&0xffffff00)|r.animation)>>>0;p.normalEventDecision.animation=r.animation;}
 if(r.awardBase!==undefined)b.field818=r.awardBase;
 if(r.bikeAnimation){s.bikeAnimation=r.bikeAnimation;s.riderAnimation=r.riderAnimation;}
 if(r.scratch540){b.offset=p.offset=r.scratch540;b.normal=p.normal=r.scratch54c;}
 if(r.boundsMin){b.boundsMin=r.boundsMin;b.boundsMax=r.boundsMax;}
}
