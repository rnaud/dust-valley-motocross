import {applyMcmBikeEventDecision} from './reset-event-decision.js';
import {setupMcmResetEvent} from './reset-event-setup.js';
import {joinMcmSubstepEvent} from './normal-event-join-substep.js';

// Continue the same second-pass bike/rider state through the event wrapper
// and join, stopping at rider entry or the common post-event tail.
export function continueMcmResetLoopEvent(c){
 const p=c.contactPhase;
 applyMcmBikeEventDecision(c);setupMcmResetEvent(c);
 p.normalEventJoin.delay=c.bike.field8c8;
 joinMcmSubstepEvent(p);c.bike.field8c8=p.normalEventJoin.delay;
}
