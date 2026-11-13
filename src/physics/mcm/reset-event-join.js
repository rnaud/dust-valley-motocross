import {updateMcmResetEventSetup} from './reset-event-setup.js';
import {joinMcmSubstepEvent} from './normal-event-join-substep.js';

// Event return through the common tail or the entry of rider update 0x4aecb0.
export function updateMcmResetEventJoin(c){
 const result=updateMcmResetEventSetup(c),p=c.contactPhase;
 p.normalEventJoin.delay=c.bike.field8c8;
 joinMcmSubstepEvent(p);
 c.bike.field8c8=p.normalEventJoin.delay;
 return result;
}
