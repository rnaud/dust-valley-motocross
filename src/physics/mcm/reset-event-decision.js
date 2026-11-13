import {updateMcmResetAlignment} from './reset-alignment.js';
import {applyMcmSubstepEventDecision} from './normal-event-decision-substep.js';

// Continue the reset path into the real event wrapper/decision, stopping at
// 0x4a4baa before state844 and rider setup are committed by the wrapper.
export function updateMcmResetEventDecision(c){
 const result=updateMcmResetAlignment(c),b=c.bike,p=c.contactPhase,s=p.normalEventDecision;
 Object.assign(s,{target:b.spawnPosition,launch:b.fieldc40,animation:b.field814&255,
  eventKind:b.field8b8,uprightThreshold:b.field86c,decel:b.field868,accel:b.field864,
  triggered:0,randomCalls:0,inputCalls:0,otherPresent:+!!b.field8b0});
 Object.assign(p.controllerHandoff,{kind:b.field8b4,other:b.field8b0,otherVelocity:[0,0,0]});
 p.bikeUp=b.up;p.cooldownFlag=b.field8ac;p.normalControl={flag820:b.field820};
 p.leanDisabled=b.field710;p.field714=b.field714;
 applyMcmSubstepEventDecision(p);
 b.velocity=p.velocity;b.angularVelocity=[...p.chassisResponse.angularXY,p.field53c];
 b.field710=p.leanDisabled;b.field714=p.field714;
 b.field8b8=s.eventKind;b.field8b4=p.controllerHandoff.kind;b.field8b0=s.otherPresent?b.field8b0:0;
 return {...result,randomCalls:result.randomCalls+s.randomCalls};
}
