import {updateMcmCollisionDispatchSubstep} from './collision-dispatch-substep.js';
import {finishMcmSubstep} from './substep-finish.js';

// Continuous ordinary prefix through 0x4ac94b, before the loop-back branch.
export function updateMcmFinishedSubstep(c){
 const result=updateMcmCollisionDispatchSubstep(c);
 const r=finishMcmSubstep({remaining:c.control20,carry:c.normalEventJoin.delay,dt:c.dt,inverseDt:c.turnScale,local:c.bodyNode.local});
 c.control20=c.normalEventJoin.flag=r.remaining;c.normalEventJoin.delay=r.carry;c.dt=r.dt;c.turnScale=r.inverseDt;
 c.bikeForward=r.forward;c.bikeUp=r.up;c.heading=r.yaw;c.pitch=r.pitch;c.roll=r.roll;c.sinRoll=r.sinRoll;c.cosRoll=r.cosRoll;c.cosPitch=r.cosPitch;
 return result;
}
