import {updateMcmNormalEventSetupSubstep} from './normal-event-setup-substep.js';

// Original callers after 0x4a4b60, through the common 0x4ac6cd join or
// the entry of the real rider update at 0x4aecb0 (before its prologue).
export function updateMcmNormalEventJoinSubstep(c){
 const result=updateMcmNormalEventSetupSubstep(c),s=c.normalEventJoin;
 s.called=0;s.flag=c.control20;
 if(c.normalEventDecision.triggered){c.control20=s.flag=1;s.delay=0;return result;}
 if(c.state844||s.flag!==1)return result;
 s.called=1;
 const airborneRoute=!c.frontSuspension.contactLimited&&!c.rearSuspension.contactLimited&&!!c.field4bc;
 s.height=airborneRoute||c.rearContact?Math.fround(-c.heights[0]):0;
 s.control=c.balanceFilter[0];s.dt=c.dt;
 return result;
}
