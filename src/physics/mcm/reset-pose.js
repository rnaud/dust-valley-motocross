import {resetMcmBikeState} from './bike-reset.js';
import {floatBits} from './math.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmLocalChildOrientation} from './local-child-transform.js';
import {rotateMcmTransform,rotateMcmTransformAtPivot} from './transform.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {setMcmRelativeChildOrientation} from './relative-child-transform.js';
import {queryMcmTerrainHeight} from './terrain-height.js';
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

// Continue 0x49f8f0 through 0x49fcd0: terrain support and half-angle pivot
// alignment. The following contact query and final alignment are separate.
export function alignMcmResetPoseToTerrain(c){
 const result=prepareMcmResetPose(c),b=c.bike,p=c.points;
 p[1]=resolveMcmWorldMatrix(c.rearNode).slice(12,15);
 p[0]=resolveMcmWorldMatrix(c.frontNode).slice(12,15);
 p[1]=queryMcmTerrainHeight({...c.terrain,point:p[1]});
 p[0]=queryMcmTerrainHeight({...c.terrain,point:p[0]});
 p[4]=[0,1,0];p[5]=[0,1,0];
 const rearHigher=p[1][1]>p[0][1],height=rearHigher?p[1][1]:p[0][1];
 b.position[1]=height;c.bodyNode.local.splice(12,3,...b.position);invalidateMcmTransform(c.bodyNode);
 const depth=f((rearHigher?p[0][1]:p[1][1])-height);
 c.heights=rearHigher?[depth,0]:[0,depth];
 const angle=f(Math.atan2(-depth,b.field5d8)*(rearHigher?.5:-.5));
 const pivot=[0,0,rearHigher?f(-b.field5dc):b.field5dc];
 c.bodyNode.local=rotateMcmTransformAtPivot(c.bodyNode.local,pivot,[1,0,0],angle);invalidateMcmTransform(c.bodyNode);
 b.position=c.bodyNode.local.slice(12,15);
 const world=resolveMcmWorldMatrix(c.bodyNode);b.forward=world.slice(8,11);b.up=world.slice(4,7);
 setMcmRelativeChildOrientation(c.componentNode,null,b.forward,b.up);
 c.component8e4.field58=0;c.component8e8.field5c=0;
 return {...result,rearHigher};
}
