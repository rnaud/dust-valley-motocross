import {updateMcmResetCollisionDispatch} from './reset-collision-dispatch.js';
import {finishMcmSubstep} from './substep-finish.js';

// Continuous alternate reset path through 0x4ac94b, before loop-back.
export function updateMcmResetFinishedSubstep(c){
 const result=updateMcmResetCollisionDispatch(c);
 applyMcmBikeSubstepFinish(c);return result;
}

export function applyMcmBikeSubstepFinish(c){
 const b=c.bike,p=c.contactPhase;
 c.finishPrior={remaining:p.control20,carry:b.field8c8};
 const r=finishMcmSubstep({remaining:p.control20,carry:b.field8c8,dt:p.dt,inverseDt:p.turnScale,local:c.bodyNode.local});
 b.field8c8=p.normalEventJoin.delay=r.carry;p.control20=p.normalEventJoin.flag=r.remaining;p.dt=r.dt;p.turnScale=r.inverseDt;
 b.forward=p.bikeForward=r.forward;b.up=p.bikeUp=r.up;
 b.field4e0=p.heading=r.yaw;b.field4dc=p.pitch=r.pitch;b.field4d8=p.roll=r.roll;
 b.field4e4=p.sinRoll=r.sinRoll;b.field4e8=p.cosRoll=r.cosRoll;b.field4ec=p.cosPitch=r.cosPitch;
 return r;
}
