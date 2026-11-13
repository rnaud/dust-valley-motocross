import {resetMcmBikeState} from './bike-reset.js';
import {floatBits} from './math.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmLocalChildOrientation} from './local-child-transform.js';
import {rotateMcmTransform} from './transform.js';
const f=Math.fround;

// Original 0x49f8f0..0x49fa3c, including the complete bike reset and 0x49ee70.
// This prepares the pose at y=100 before the following terrain alignment.
export function prepareMcmResetPose(c){
 const result=resetMcmBikeState(c),b=c.bike,{bodyNode,componentNode,pose}=c;
 b.forward=[...pose.forward];b.up=[...pose.up];
 bodyNode.local.splice(12,3,pose.position[0],100,pose.position[2]);invalidateMcmTransform(bodyNode);
 b.position=bodyNode.local.slice(12,15);
 if(b.forward[0]===0&&b.forward[2]===0){
  const sign=floatBits(b.forward[1])>0x80000000?1:-1;
  b.forward=b.up.map(x=>f(x*sign));
 }
 b.up=[0,1,0];componentNode.local.splice(12,3,0,0,0);invalidateMcmTransform(componentNode);
 b.forward[1]=0;
 setMcmLocalChildOrientation(bodyNode,b.forward,b.up);
 setMcmLocalChildOrientation(componentNode,b.forward,b.up);
 c.componentAngle=0;
 componentNode.local=[...bodyNode.local];invalidateMcmTransform(componentNode);
 componentNode.local.splice(12,3,0,0,0);invalidateMcmTransform(componentNode);
 componentNode.local=rotateMcmTransform(componentNode.local,c.componentAxis,-0);invalidateMcmTransform(componentNode);
 return result;
}
