import {applyMcmBikeEventDecision} from './reset-event-decision.js';
import {setupMcmResetEvent} from './reset-event-setup.js';
import {joinMcmSubstepEvent} from './normal-event-join-substep.js';

// Continue the same second-pass bike/rider state through the event wrapper
// and join, stopping at rider entry or the common post-event tail.
export function continueMcmResetLoopEvent(c){
 const p=c.contactPhase;
 // A bike already in crash state jumps directly from controls to 0x4ac6cd.
 // Clear only observer counters; retain the bike, rider and join scratch.
 if(p.state844){
  Object.assign(p.normalEventDecision,{triggered:0,inputCalls:0,randomCalls:0});
  p.normalEventJoin.called=0;return;
 }
 applyMcmBikeEventDecision(c);setupMcmResetEvent(c);
 p.normalEventJoin.delay=c.bike.field8c8;
 joinMcmSubstepEvent(p);c.bike.field8c8=p.normalEventJoin.delay;
}
