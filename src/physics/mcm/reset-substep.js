import {selectMcmResetPose} from './reset-selection.js';
import {resetMcmBikePose} from './reset-pose.js';

// Original main-loop alternate path 0x4a5eb4..0x4a64dc. The caller has
// already selected a nonzero reset reason. Heights alias bike+590/+594.
export function resetMcmSubstep(c){
 const b=c.bike;
 selectMcmResetPose(c);c.pose.up=b.up;
 const result=resetMcmBikePose(c);
 [b.field590,b.field594]=c.heights;
 c.control1c=0;c.control30=0;c.control2c=0;c.resetReason=0;b.field88c=0;
 if(c.observerBike!==b){b.field888=3;b.field8ac=1;}
 return result;
}
