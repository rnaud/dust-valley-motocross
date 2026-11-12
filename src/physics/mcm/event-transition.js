import {floatBits} from './math.js';
import {decideMcmBikeEvent} from './event-decision.js';
import {alignMcmEventRootOrientation} from './event-orientation.js';
import {startMcmRiderEvent} from './rider-event.js';
import {applyMcmLocalChildTransform} from './local-child-transform.js';
import {applyMcmRelativeChildTransform} from './relative-child-transform.js';

// Original 0x4a4b60 with its real decision/orientation/rider callees. Currently
// supports root bike transforms and an ordered list of child callback records.
export function transitionMcmBikeEvent(c){
 // The wrapper swaps stack arguments 10 and 11 when calling the decision helper.
 const s=c.setup,decision=decideMcmBikeEvent({...c,arg11:c.arg10}),f=Math.fround;
 const target={local:[...s.targetLocal],world:[...s.targetWorld],cacheValid:s.targetCache};
 const source={local:[...s.sourceLocal],world:[...s.sourceWorld],cacheValid:s.sourceCache};
 if(s.parented){source.parent=target;target.firstChild=source;}
 const components=(s.components||[]).map(n=>({local:[...n.local],world:[...n.world],cacheValid:n.cacheValid}));
 for(let i=0;i<components.length;i++){
  const parentIndex=s.components[i].parentIndex;
  if(parentIndex>=i)throw new RangeError('Component parents must precede their children');
  const node=components[i],parent=parentIndex<0?target:components[parentIndex];
  node.parent=parent;node.nextSibling=parent.firstChild;parent.firstChild=node;
 }
 const boundsChildren=(s.boundsChildren||[]).map(record=>({...record,forward:[...record.forward],up:[...record.up],position:[...record.position]}));
 const r={components,boundsChildren,...decision,state:decision.triggered,field820:c.field820,animation:c.animation,envelope:[...s.envelope],direction:[...s.direction],inverted:s.inverted,field890:s.field890,resource:s.resource,boundsMin:[...s.liveBoundsMin],boundsMax:[...s.liveBoundsMax],scratch540:[...s.scratch540],scratch54c:[...s.scratch54c],target,source,rider:{...s.rider}};
 if(!r.state)return r;
 r.envelope=[0,f(c.time*21),1,-1];
 if(r.field820){
  const axes=alignMcmEventRootOrientation(source,target);
  r.scratch540=axes.forward;r.scratch54c=axes.up;
  r.boundsMin=[...s.boundsMin];r.boundsMax=[...s.boundsMax];
  // Original 0x430970 traverses record+0x2c in list order and dispatches
  // the player's vtable+0x1c callback (0x44fa70) for each record.
  for(const record of boundsChildren){
   const node=components[record.componentIndex];
   if(!node)throw new RangeError('Unknown child component index');
   (record.local?applyMcmLocalChildTransform:applyMcmRelativeChildTransform)(target,node,record);
  }
  r.field820=0;
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
