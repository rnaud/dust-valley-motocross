import {updateMcmResetEventJoin} from './reset-event-join.js';
import {updateMcmRider} from './rider-update.js';

// Execute the rider body reached from reset, then return to 0x4ac6cd.
// Reset establishes ground contact and clears trick control. Those native
// invariants exclude input/trick/orientation callbacks in this invocation.
export function updateMcmResetRider(c){
 const result=updateMcmResetEventJoin(c),b=c.bike,p=c.contactPhase,j=p.normalEventJoin;
 if(!j.called)return result;
 if(p.field4bc||p.normalControl.flag820)throw new RangeError('Unexpected airborne/trick state after reset');
 const r=updateMcmRider({state:b.field844,field710:b.field710,fieldbfc:b.fieldbfc,
  ai:b.field614,secondaryControl:b.field618,field4bc:p.field4bc,
  height0:c.heights[0],height1:c.heights[1],height:j.height,steer:j.control,
  enabled:p.normalControl.flag820,control:b.field6f4,blend:b.field730,
  positivePeak:b.field708,negativePeak:b.field704,envelope:c.effect,nominalDt:b.field8cc,
  axis:p.componentAngle,limit:c.riderComponentLimit,dt:p.dt,
  lowerHeight:b.field71c,upperHeight:b.field720,poseSpeed:b.field738,
  pose:b.field724,weight:b.field728,nextPose:b.field72c,secondaryWeight:b.field734,
  fieldb4c:b.fieldb4c});
 b.field724=r.pose;b.field728=r.weight;b.field72c=r.nextPose;b.field734=r.secondaryWeight;
 b.field730=r.blend;b.field708=r.positivePeak;b.field704=r.negativePeak;c.effect=r.envelope;
 p.normalControl.field730=r.blend;p.normalEventSetup.envelope=r.envelope;
 return result;
}
