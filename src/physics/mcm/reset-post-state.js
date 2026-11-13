import {updateMcmResetRider} from './reset-rider.js';
import {updateMcmPostEventState} from './post-event-state.js';

// Continue reset through the common post-event tail, 0x4ac6cd..0x4ac7c4.
export function updateMcmResetPostState(c){
 const result=updateMcmResetRider(c);
 applyMcmBikePostState(c);return result;
}

export function applyMcmBikePostState(c){
 const b=c.bike,p=c.contactPhase;
 const r=updateMcmPostEventState({node:c.bodyNode,angularVelocity:b.angularVelocity,
  speed:b.field6a4,both:p.bothContact,field714:b.field714,field870:b.field870,
  fieldbfc:b.fieldbfc,timer:b.field718,score:b.fieldc7c,awardBase:b.field818,
  suppressAward:c.mode!==0,dt:p.dt,frontHeight:c.heights[0],rearHeight:c.heights[1]});
 b.position=p.bodyPosition=r.position;b.angularVelocity=r.angularVelocity;
 p.chassisResponse.angularXY=r.angularVelocity.slice(0,2);p.field53c=r.angularVelocity[2];
 b.worldAngularVelocity=p.angularVelocity=r.worldAngularVelocity;
 b.field714=p.field714=r.field714;b.field870=p.field870=r.field870;
 b.field718=p.field718=r.timer;b.fieldc7c=r.score;b.field8d0=r.lastDt;
 c.component8e4.field58=p.frontSuspension.previousHeight=r.frontHeight;
 c.component8e8.field5c=p.rearSuspension.previousHeight=r.rearHeight;
 c.postState=r;
 return r;
}
