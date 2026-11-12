import {floatBits} from './math.js';
import {decideMcmBikeEvent} from './event-decision.js';
import {alignMcmEventRootOrientation} from './event-orientation.js';
import {startMcmRiderEvent} from './rider-event.js';

// Original 0x4a4b60 with its real decision/orientation/rider callees. Currently
// supports root bike transforms and bounds records with no child callbacks.
export function transitionMcmBikeEvent(c){
 // The wrapper swaps stack arguments 10 and 11 when calling the decision helper.
 const s=c.setup,decision=decideMcmBikeEvent({...c,arg11:c.arg10}),f=Math.fround;
 const target={local:[...s.targetLocal],world:[...s.targetWorld],cacheValid:s.targetCache};
 const source={local:[...s.sourceLocal],world:[...s.sourceWorld],cacheValid:s.sourceCache};
 if(s.parented){source.parent=target;target.firstChild=source;}
 const r={...decision,state:decision.triggered,field820:c.field820,animation:c.animation,envelope:[...s.envelope],direction:[...s.direction],inverted:s.inverted,field890:s.field890,resource:s.resource,boundsMin:[...s.liveBoundsMin],boundsMax:[...s.liveBoundsMax],scratch540:[...s.scratch540],scratch54c:[...s.scratch54c],target,source,rider:{...s.rider}};
 if(!r.state)return r;
 r.envelope=[0,f(c.time*21),1,-1];
 if(r.field820){
  if(s.boundsChildren?.length)throw new RangeError('Bike event child transform callbacks are not yet recovered');
  const axes=alignMcmEventRootOrientation(source,target);
  r.scratch540=axes.forward;r.scratch54c=axes.up;
  r.boundsMin=[...s.boundsMin];r.boundsMax=[...s.boundsMax];r.field820=0;
 }
 r.direction=[s.forward[0],0,s.forward[2]];
 r.animation=0;r.field710=0;r.field714=0;
 r.inverted=+(floatBits(c.up[1])>0x80000000);r.field890=s.field4e0;
 if(r.eventKind===1&&(floatBits(r.angularVelocity[0])|0)<0x3fc8f5c3)r.angularVelocity[0]=f(1.57);
 const rider=startMcmRiderEvent({kind:r.eventKind,records:s.records,randomValues:s.randomValues,velocity:r.velocity});
 r.rider={...rider,velocity:[...r.velocity],angularVelocity:r.angularVelocity.map(v=>f(v*.75))};
 r.randomCalls+=rider.randomCalls;r.resource=r.eventKind===2?s.alternateResource:s.normalResource;
 return r;
}
