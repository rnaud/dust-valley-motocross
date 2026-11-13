import {continueMcmResetLoopContact} from './reset-loop-contact.js';
import {updateMcmPreparedResetSubstep} from './prepared-reset-substep.js';
// Original 0x4a5e27..0x4a64dc, continuing the carried frame state.
export function prepareMcmFrameContacts(c,resetCode){
 const e=c.frameEntry,p=c.contactPhase;
 c.resetReason=resetCode;p.componentRate=e.control28;
 Object.assign(c,{control1c:e.control1c,control30:e.control30,control2c:e.control2c});
 const result=resetCode?updateMcmPreparedResetSubstep(c):continueMcmResetLoopContact(c);
 if(resetCode)Object.assign(e,{control1c:c.control1c,control30:c.control30,control2c:c.control2c});
 Object.assign(p,{control1c:e.control1c,control30:e.control30,control2c:e.control2c});
 return {branch:resetCode?'reset':'ordinary',randomCalls:resetCode?result.randomCalls:0};
}
