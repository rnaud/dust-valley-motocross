import {updateMcmFrameRider} from './frame-rider.js';
import {applyMcmAnimationChild} from './animation-seek.js';
import {queryMcmBikeInput} from './bike-input.js';
import {floatBits,bitsFloat} from './math.js';

// Bridge the live substep context into the frame-end rider routine. Animation
// objects/assets must exist before substeps run; this never initializes them.
export function updateMcmRetainedFrameRider(c,rawDelta){
 const b=c.bike,a=c.frameRider,view={};
 const fields={state:'844',secondaryControl:'618',ai:'614',pose:'724',weight:'728',nextPose:'72c',fraction:'730',secondaryWeight:'734',enabled:'820',speed:'848',field710:'710',field714:'714',fieldbfc:'bfc',elapsed:'818',holdTime:'81c',active:'824',lean:'82c',progress:'830',angle:'834',heading:'4e0'};
 for(const [key,field] of Object.entries(fields))Object.defineProperty(view,key,{get:()=>b[`field${field}`],set:v=>{b[`field${field}`]=v;}});
 Object.defineProperty(view,'animation',{get:()=>b.field814&255,set:v=>{b.field814=((b.field814&0xffffff00)|(v&255))>>>0;}});
 Object.defineProperty(view,'returning',{get:()=>floatBits(b.field828)|0,set:v=>{b.field828=bitsFloat(v);}});
 for(const [key,field] of [['position','position'],['scratch540','offset'],['scratch54c','normal']])Object.defineProperty(view,key,{get:()=>b[field],set:v=>{b[field]=v;}});
 const components=c.bounds.components.map((node,i)=>({node,positionEnabled:a.positionFlags[i]}));
 // Bounds children are the same mutable records used by event recovery.
 const children=c.bounds.children.slice(0,c.bounds.count);
 for(let i=0;i<children.length;i++)children[i].next=children[i+1];
 const queries=[];
 updateMcmFrameRider({bike:view,...a,bodyNode:c.bodyNode,riderBodyNode:c.proxy,sourceNode:c.bodyNode,
  leanAngle:c.componentAngle,target:c.loopRider.nearby,components,
  boundsFrame:{boundsMin:c.bounds.min,boundsMax:c.bounds.max,firstChild:children[0]},
  applyBike:child=>applyMcmAnimationChild(c.bodyNode,components,child),
  applyRider:child=>applyMcmAnimationChild(c.proxy,components,child),
  query(action){const q=queryMcmBikeInput({ai:b.field614,secondaryControl:b.field618,povPresent:0,presentMask:1,action,option:0,responses:[c.loopRider.buttons[[9,6,7].indexOf(action)],0,0,0,0,0]});if(q.polled.length)queries.push(action);return q.value;}
 },rawDelta);
 const tokens=o=>[o.stopped,o.record?.token??0,o.frame.token,o.field30,o.blending];
 c.loopRider.bikeAnimation=tokens(a.bikeAnimation);c.loopRider.riderAnimation=tokens(a.riderAnimation);
 b.field8=a.bikeAnimation.remainder;
 return {queries};
}
