import {applyMcmLocalChildTransform} from './local-child-transform.js';
import {applyMcmRelativeChildTransform} from './relative-child-transform.js';
import {updateMcmNormalEventDecisionSubstep} from './normal-event-decision-substep.js';
import {alignMcmEventRootOrientation} from './event-orientation.js';
import {startMcmRiderEvent} from './rider-event.js';
import {floatBits} from './math.js';
import {mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;

// Original event wrapper through its return, before the main loop's join.
export function updateMcmNormalEventSetupSubstep(c){
 const result=updateMcmNormalEventDecisionSubstep(c);
 if(c.state844)return result;
 applyMcmSubstepEventSetup(c);
 return result;
}
export function applyMcmSubstepEventSetup(c){
 const d=c.normalEventDecision,s=c.normalEventSetup;
 c.state844=d.triggered;
 if(!d.triggered)return;
 s.envelope=[0,f(mul(c.linearIntegration.field8cc,21)),1,-1];
 if(c.normalControl.flag820){
  const axes=alignMcmEventRootOrientation(c.nodes[s.sourceIndex],c.bodyNode);
  c.offset=axes.forward;c.normal=axes.up;s.liveBoundsMin=[...s.boundsMin];s.liveBoundsMax=[...s.boundsMax];
  for(const record of (s.boundsChildren||[]).slice(0,s.childCount)){
   const node=s.children[record.componentIndex];
   (record.local?applyMcmLocalChildTransform:applyMcmRelativeChildTransform)(c.bodyNode,node,record);
  }
  c.normalControl.flag820=0;
 }
 s.direction=new Float64Array(3);s.direction[0]=c.bikeForward[0];s.direction[2]=c.bikeForward[2];d.animation=0;c.leanDisabled=0;c.field714=0;
 s.inverted=+(floatBits(c.bikeUp[1])>0x80000000);s.field890=c.heading;
 if(d.eventKind===1&&(floatBits(c.chassisResponse.angularXY[0])|0)<0x3fc8f5c3)c.chassisResponse.angularXY[0]=f(1.57);
 c.controllerHandoff.velocity=[...c.velocity];
 const angular=new Float64Array(3);angular[0]=f(mul(c.chassisResponse.angularXY[0],.75));angular[1]=f(mul(c.chassisResponse.angularXY[1],.75));angular[2]=f(mul(c.field53c,.75));c.controllerHandoff.angularVelocity=angular;
 const rider=startMcmRiderEvent({kind:d.eventKind,records:s.records,randomValues:s.randomValues,velocity:c.velocity});
 Object.assign(s,{previousVelocity:rider.previousVelocity,selected:rider.selected,active16c:rider.active16c});c.controllerHandoff.flag13c=rider.active13c;c.contactCorrection.controller170=rider.kind;
 d.randomCalls+=rider.randomCalls;s.resource=d.eventKind===2?s.alternateResource:s.normalResource;

}
