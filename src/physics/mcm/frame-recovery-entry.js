import {alignMcmEventRootOrientation} from './event-orientation.js';
import {applyMcmLocalChildTransform} from './local-child-transform.js';
import {applyMcmRelativeChildTransform} from './relative-child-transform.js';
import {startMcmAnimation} from './animation-seek.js';
import {floatBits} from './math.js';

// Original 0x4a5566..0x4a5672, retaining the preceding frame's live state.
export function recoverMcmFrameEntry(c,mode){
 const b=c.bike;
 const restore=()=>{
  const axes=alignMcmEventRootOrientation(c.bodyNode,c.bodyNode);
  b.offset=axes.forward;b.normal=axes.up;
  b.boundsMin=[...c.bounds.min];b.boundsMax=[...c.bounds.max];
  for(const child of c.bounds.children.slice(0,c.bounds.count)){
   const node=c.bounds.components[child.componentIndex&255];
   (child.local?applyMcmLocalChildTransform:applyMcmRelativeChildTransform)(c.bodyNode,node,child);
  }
  b.field820=0;
 };
 let branch='bypass';
 if([1,2,3].includes(mode)&&b.fieldbfc===1){
  if(floatBits(b.fieldbf8)===1){
   branch=b.field820?'animate-restored':'animate';
   if(b.field820)restore();
   startMcmAnimation(c.frameRider.riderAnimation,c.frameRider.records[15]);
   b.fieldbfc=2;
  }else{branch='restore';b.fieldbfc=3;}
  b.field710=0;b.field714=0;
  if(branch==='restore')restore();
 }
 c.frameEntry.control28=0;
 return branch;
}
