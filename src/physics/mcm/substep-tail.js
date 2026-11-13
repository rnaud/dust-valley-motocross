import {updateMcmPostEventState} from './post-event-state.js';
import {updateMcmCollisionSubstep} from './collision-substep.js';
import {finishMcmSubstep} from './substep-finish.js';

// Original 0x4ac6cd..0x4ac94b: common post-event state, collision callbacks,
// scheduler remainder and final orientation refresh, in that order.
export function updateMcmSubstepTail(c){
 const {bike}=c;
 const post=updateMcmPostEventState({...c.post,node:bike.transform,angularVelocity:bike.angularVelocity,speed:bike.speed,dt:c.dt});
 Object.assign(bike,{position:post.position,angularVelocity:post.angularVelocity,worldAngularVelocity:post.worldAngularVelocity,field8d0:post.lastDt});
 // The collision event observes any delayed-award flag change made above.
 Object.assign(c.event,{field714:post.field714,height0:post.frontHeight,height1:post.rearHeight});
 updateMcmCollisionSubstep(c);
 const finish=finishMcmSubstep({remaining:c.remaining,carry:bike.carry,dt:c.dt,inverseDt:c.inverseDt,local:bike.transform.local});
 c.remaining=finish.remaining;c.dt=finish.dt;c.inverseDt=finish.inverseDt;
 Object.assign(bike,{carry:finish.carry,forward:finish.forward,up:finish.up,heading:finish.yaw,pitch:finish.pitch,roll:finish.roll,sinRoll:finish.sinRoll,cosRoll:finish.cosRoll,cosPitch:finish.cosPitch});
 return {post,finish};
}
