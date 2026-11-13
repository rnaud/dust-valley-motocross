import {setMcmWorldMatrix} from './proxy-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
import {resetMcmBikeState} from './bike-reset.js';
import {applyMcmLocalChildTransform} from './local-child-transform.js';
import {applyMcmRelativeChildTransform} from './relative-child-transform.js';
import {floatBits} from './math.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {setMcmLocalChildOrientation} from './local-child-transform.js';
import {rotateMcmTransform,rotateMcmTransformAtPivot} from './transform.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {setMcmRelativeChildOrientation} from './relative-child-transform.js';
import {queryMcmTerrainHeight} from './terrain-height.js';
import {extractMcmOrientationAngles} from './orientation-angles.js';
import {queryMcmWheelContacts} from './wheel-contact-frame.js';
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
 return {...result,rearHigher:alignResetSupport(c)};
}

// Shared arithmetic in the initial alignment and original 0x49ff10.
function alignResetSupport(c){
 const b=c.bike,p=c.points;
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
 return rearHigher;
}

// Continue through 0x49fd8b: extract angles and run the full wheel query on
// the terrain support positions produced above (not fresh transform reads).
export function queryMcmResetContacts(c){
 const result=alignMcmResetPoseToTerrain(c),b=c.bike;
 c.heights[result.rearHigher?0:1]=f(-.01);b.field4bc=0;
 const angles=extractMcmOrientationAngles(b.forward,b.up);
 Object.assign(b,{field4e0:angles.yaw,field4dc:angles.pitch,field4d8:angles.roll,field4e4:angles.sinRoll,field4e8:angles.cosRoll,field4ec:angles.cosPitch});
 const q={terrain:c.terrain,node:c.componentNode,radius:c.frontRadius,rearRadius:c.rearRadius,points:c.points,heights:c.heights,bikeForward:b.forward,bikeUp:b.up,pitch:angles.pitch,heading:angles.yaw,sinRoll:angles.sinRoll,...c.contactScratch};
 const contact=queryMcmWheelContacts(q);
 c.points=q.points;c.heights=q.heights;b.tangent=q.tangent;b.rearTangent=q.rearTangent;b.normal=q.normal;b.offset=q.offset;
 return {...result,contact};
}

// Continue through 0x49fe3a: second support correction, refreshed angles,
// final wheel world positions and the designated reference-node position.
export function finishMcmResetContacts(c){
 const result=queryMcmResetContacts(c),b=c.bike,rearHigher=alignResetSupport(c);
 c.heights[rearHigher?0:1]=f(-.01);b.field4bc=0;
 const angles=extractMcmOrientationAngles(b.forward,b.up);
 Object.assign(b,{field4e0:angles.yaw,field4dc:angles.pitch,field4d8:angles.roll,field4e4:angles.sinRoll,field4e8:angles.cosRoll,field4ec:angles.cosPitch});
 c.points[1]=resolveMcmWorldMatrix(c.rearNode).slice(12,15);
 c.points[0]=resolveMcmWorldMatrix(c.frontNode).slice(12,15);
 b.referencePosition=resolveMcmWorldMatrix(c.referenceNode).slice(12,15);
 return {...result,rearHigher};
}

// Continue through 0x49fe41, including 0x4309d0/0x430970 and each real
// player child callback. Records are mutable: orientation normalizes axes.
export function updateMcmResetBounds(c){
 const result=finishMcmResetContacts(c);
 c.bike.boundsMin=[...c.bounds.min];c.bike.boundsMax=[...c.bounds.max];
 for(const record of c.bounds.children.slice(0,c.bounds.count)){
  const node=c.bounds.components[record.componentIndex];
  if(!node)throw new RangeError('Unknown child component index');
  (record.local?applyMcmLocalChildTransform:applyMcmRelativeChildTransform)(c.bodyNode,node,record);
 }
 return result;
}

// Complete original 0x49f8f0. Copy the body world matrix before proxy updates:
// the proxy may share ancestors with the body and invalidate its cache.
export function resetMcmBikePose(c){
 const result=updateMcmResetBounds(c),b=c.bike;
 if(c.collision){
  c.collision.other=null;
  c.collision.matrix=[...resolveMcmWorldMatrix(c.bodyNode)];
  setMcmWorldMatrix(c.proxy,c.collision.matrix);
  updateMcmCollisionGrid(c.collision,c.grid,c.gridEnabled);
 }else{
  const matrix=[...resolveMcmWorldMatrix(c.bodyNode)];
  setMcmWorldMatrix(c.proxy,matrix);
 }
 b.savedPosition=[...b.position];b.field8c0=1;b.fieldcb4=1;
 return result;
}
