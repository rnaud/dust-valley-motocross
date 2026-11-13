import {updateMcmNormalRiderSubstep} from './normal-rider-substep.js';
import {updateMcmPostEventState} from './post-event-state.js';

// Original common 0x4ac6cd..0x4ac7c4 after both normal and crashed paths.
export function updateMcmPostStateSubstep(c){
 const result=updateMcmNormalRiderSubstep(c),s=c.postState;
 const angularVelocity=new Float64Array(3);
 angularVelocity[0]=c.chassisResponse.angularXY[0];angularVelocity[1]=c.chassisResponse.angularXY[1];angularVelocity[2]=c.field53c;
 const r=updateMcmPostEventState({node:c.bodyNode,angularVelocity,speed:c.chassisImpulse.speed,both:c.bothContact,field714:c.field714,field870:c.field870,fieldbfc:c.normalRider.fieldbfc,timer:c.field718,score:s.score,awardBase:c.normalRider.awardBase,suppressAward:s.suppressAward,dt:c.dt,frontHeight:c.heights[0],rearHeight:c.heights[1]});
 c.bodyPosition=r.position;c.chassisResponse.angularXY=r.angularVelocity.slice(0,2);c.field53c=r.angularVelocity[2];c.angularVelocity=r.worldAngularVelocity;
 c.field714=r.field714;c.field870=r.field870;c.field718=r.timer;s.score=r.score;s.lastDt=r.lastDt;s.awardCalled=+r.awardCalled;
 c.frontSuspension.previousHeight=r.frontHeight;c.rearSuspension.previousHeight=r.rearHeight;
 return result;
}
