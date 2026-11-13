import {applyMcmBikeRider} from './reset-rider.js';
import {queryMcmBikeInput} from './bike-input.js';
import {startMcmTrick} from './trick-start.js';
import {resetMcmEventOrientation} from './event-graph.js';

// Execute the real rider paths reachable from the completed reset's second pass.
export function continueMcmResetLoopRider(c){
 const b=c.bike,p=c.contactPhase,s=c.loopRider;
 s.queries=[];s.trickIndex=-1;
 const setup={graph:{target:c.bodyNode,source:c.bodyNode,components:c.bounds.components,
  boundsChildren:c.bounds.children.slice(0,c.bounds.count)},boundsMin:c.bounds.min,boundsMax:c.bounds.max,
  liveBoundsMin:b.boundsMin,liveBoundsMax:b.boundsMax,scratch540:b.offset,scratch54c:b.normal};
 const r=applyMcmBikeRider(c,{
  query(action){
   const q=queryMcmBikeInput({ai:b.field614,secondaryControl:b.field618,povPresent:0,presentMask:1,
    action,option:0,responses:[s.buttons[[9,6,7].indexOf(action)],0,0,0,0,0]});
   if(q.polled.length)s.queries.push(action);return q.value;
  },
  trick(r,trickIndex){
   s.trickIndex=trickIndex;
   Object.assign(r,startMcmTrick({setup,trickIndex,field820:r.enabled,time:b.field8cc,
    bikeAnimationRecords:s.bikeRecords,riderAnimationRecords:s.riderRecords}));r.enabled=r.field820;
  },
  resetOrientation(r){Object.assign(r,setup.graph);resetMcmEventOrientation(r,setup);},
  nearby(){throw new RangeError('Nearby interaction requires an already enabled rider; reset clears this state');}
 });
 if(!r)return;
 if(r.animation!==undefined){b.field814=((b.field814&0xffffff00)|r.animation)>>>0;p.normalEventDecision.animation=r.animation;}
 if(r.awardBase!==undefined)b.field818=r.awardBase;
 if(r.bikeAnimation){s.bikeAnimation=r.bikeAnimation;s.riderAnimation=r.riderAnimation;}
 if(r.scratch540){b.offset=p.offset=r.scratch540;b.normal=p.normal=r.scratch54c;}
 if(r.boundsMin){b.boundsMin=r.boundsMin;b.boundsMax=r.boundsMax;}
}
