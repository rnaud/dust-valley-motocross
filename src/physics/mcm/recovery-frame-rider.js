import {startMcmAnimation} from './animation-seek.js';
import {advanceMcmAnimation} from './animation-advance.js';
import {alignMcmEventRootOrientation} from './event-orientation.js';
import {applyMcmLocalChildTransform} from './local-child-transform.js';
import {applyMcmRelativeChildTransform} from './relative-child-transform.js';

// Original 0x4afd48..0x4afdef, selected when field710=0 and fieldbfc=2.
export function updateMcmRecoveryFrameRider(c,delta){
 const {bike:b,riderAnimation}=c;
 if(riderAnimation.stopped){
  startMcmAnimation(riderAnimation,c.records[15]);b.fieldbfc=(b.fieldbfc+1)|0;
 }else advanceMcmAnimation(riderAnimation,delta,c.applyRider);
 if(b.fieldbfc<=2)return;
 b.field710=0;b.field714=0;
 const axes=alignMcmEventRootOrientation(c.sourceNode,c.bodyNode);
 b.scratch540=axes.forward;b.scratch54c=axes.up;
 c.bikeAnimation.boundsMin=[...c.boundsFrame.boundsMin];c.bikeAnimation.boundsMax=[...c.boundsFrame.boundsMax];
 for(let child=c.boundsFrame.firstChild;child;child=child.next){
  const node=c.components[child.componentIndex&255].node;
  (child.local?applyMcmLocalChildTransform:applyMcmRelativeChildTransform)(c.bodyNode,node,child);
 }
 b.enabled=0;
}
