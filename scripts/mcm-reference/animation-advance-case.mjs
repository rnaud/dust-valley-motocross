import {applyMcmAnimationChild,applyMcmMirroredAnimationChild} from '../../src/physics/mcm/animation-seek.js';
import {advanceMcmAnimation} from '../../src/physics/mcm/animation-advance.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function evaluateAnimationAdvance(c){
 const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
 nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
 if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
 const record={componentIndex:c.componentIndex,local:c.local,forward:[...c.forward],up:[...c.up],position:[...c.position]};
 const second={...record,local:!record.local,forward:[...c.up],up:[...c.forward]};
 if(c.frameCount%2===0)record.next=second;
 const components=[];components[c.componentIndex]={node:nodes[0],positionEnabled:c.positionEnabled};
 const frames=Array.from({length:c.frameCount},(_,j)=>({index:j,boundsMin:c.position.map((v,k)=>f(v+j*(k+1))),boundsMax:c.position.map((v,k)=>f(v+j*(k+4))),firstChild:j%3?record:null}));
 frames.forEach((frame,j)=>frame.next=frames[j+1]);
 const animation={frameCount:c.frameCount,firstFrame:frames[0],loop:c.loop,fps:c.fps};
 const old={...second,forward:[...second.forward],up:[...second.up],next:null};
 const oldSecond={...record,forward:[...record.forward],up:[...record.up],next:null};
 if(c.frameCount%2===0)old.next=oldSecond;
 const object={record:animation,frame:frames[c.initialFrame],displayedFrame:frames[0],previousFrame:frames.at(-1),
  stopped:c.stopped,remainder:c.remainder,blending:c.blending,blendTime:c.blendTime,blendDuration:c.blendDuration,
  blendFrame:{firstChild:c.oldHasChildren?old:null},boundsMin:[100,101,102],boundsMax:[103,104,105]};
 const remap=Array.from({length:8},(_,i)=>7-i);components[remap[c.componentIndex]]={node:nodes[0]};
 const output=[];
 for(let step=0;step<4;step++){
 const result=advanceMcmAnimation(object,c.delta,child=>c.mirror?applyMcmMirroredAnimationChild(nodes[1],components,remap,child):applyMcmAnimationChild(nodes[1],components,child));
 output.push(...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...record.forward,...record.up].map(floatBits),object.frame.index,+(object.record===animation),...[...object.boundsMin,...object.boundsMax].map(floatBits),...[...second.forward,...second.up].map(floatBits),object.stopped,floatBits(object.remainder),object.displayedFrame.index,object.previousFrame.index,floatBits(object.blendTime),object.blending,result>>>0,...[...old.forward,...old.up,...oldSecond.forward,...oldSecond.up].map(floatBits));
 }
 return output;
}
