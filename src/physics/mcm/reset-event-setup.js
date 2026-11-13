import {updateMcmResetEventDecision} from './reset-event-decision.js';
import {applyMcmSubstepEventSetup} from './normal-event-setup-substep.js';

// Continue through the event wrapper return at 0x4ac5fc/0x4ac681.
export function updateMcmResetEventSetup(c){
 const result=updateMcmResetEventDecision(c),randomCalls=setupMcmResetEvent(c);
 return {...result,randomCalls:result.randomCalls+randomCalls};
}

export function setupMcmResetEvent(c){
 const b=c.bike,p=c.contactPhase,r=c.rider,s=p.normalEventSetup;
 Object.assign(s,{envelope:c.effect,direction:b.savedHeading,inverted:b.field8a4,field890:b.field890,
  resource:b.field884,normalResource:b.field878,alternateResource:b.field880,
  previousVelocity:r.previousVelocity,selected:r.selected,active16c:r.active16c});
 Object.assign(p.controllerHandoff,{velocity:r.velocity,angularVelocity:r.angularVelocity,flag13c:r.flag13c});
 p.contactCorrection.controller170=r.kind;p.heading=b.field4e0;
 const randomBefore=p.normalEventDecision.randomCalls;
 applyMcmSubstepEventSetup(p);
 c.effect=s.envelope;b.savedHeading=s.direction;b.field8a4=s.inverted;b.field890=s.field890;b.field884=s.resource;
 b.field844=p.state844;b.field820=p.normalControl.flag820;b.field710=p.leanDisabled;b.field714=p.field714;
 b.field814=((b.field814&0xffffff00)|p.normalEventDecision.animation)>>>0;
 b.angularVelocity=[...p.chassisResponse.angularXY,p.field53c];
 Object.assign(r,{previousVelocity:s.previousVelocity,selected:s.selected,active16c:s.active16c,
  velocity:p.controllerHandoff.velocity,angularVelocity:p.controllerHandoff.angularVelocity,
  flag13c:p.controllerHandoff.flag13c,kind:p.contactCorrection.controller170});
 return p.normalEventDecision.randomCalls-randomBefore;
}
