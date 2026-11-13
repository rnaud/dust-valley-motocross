import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';
import {updateMcmCrashFrameAnimation} from '../../src/physics/mcm/crash-frame-animation.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function evaluateCrashFrameAnimation(c){
 const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
 nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
 if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
 const record={componentIndex:c.componentIndex,local:c.local,forward:[...c.forward],up:[...c.up],position:[...c.position]};
 const second={...record,local:!record.local,forward:[...c.up],up:[...c.forward]};
 if(c.frameCount%2===0)record.next=second;
 const components=[];components[c.componentIndex]={node:nodes[0],positionEnabled:c.positionEnabled};
 const frames=Array.from({length:c.frameCount},(_,j)=>({index:j,boundsMin:c.position.map((v,k)=>f(v+j*(k+1))),boundsMax:c.position.map((v,k)=>f(v+j*(k+4))),firstChild:j%3?record:null}));
 frames.forEach((frame,j)=>frame.next=frames[j+1]);
 const animation={frameCount:c.frameCount,firstFrame:frames[0]},object={};
 const state={field730:c.fraction,secondaryControl:c.secondaryControl};
 updateMcmCrashFrameAnimation(state,c.angle,object,animation,child=>applyMcmAnimationChild(nodes[1],components,child));
 return [...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),...[...record.forward,...record.up].map(floatBits),object.frame.index,+(object.record===animation),...[...object.boundsMin,...object.boundsMax].map(floatBits),...[...second.forward,...second.up].map(floatBits),floatBits(state.field730)];
}
