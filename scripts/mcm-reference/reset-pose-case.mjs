import {evaluateBikeReset} from './bike-reset-case.mjs';
import {prepareMcmResetPose} from '../../src/physics/mcm/reset-pose.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetPose(input){
 const p=structuredClone(input),nodes=p.nodes;
 nodes.forEach((n,i)=>{const parent=p.parents[i];if(parent>=0){n.parent=nodes[parent];n.nextSibling=n.parent.firstChild;n.parent.firstChild=n;}});
 let angle;
 const words=evaluateBikeReset(p,c=>{
  Object.assign(c,{bodyNode:nodes[p.bodyIndex],componentNode:nodes[p.componentIndex],pose:p.pose,componentAxis:p.componentAxis,componentAngle:p.componentAngle});
  const result=prepareMcmResetPose(c);angle=c.componentAngle;
  for(const [key,offset] of [['forward',0x4c0],['up',0x4cc],['position',0x4f8]])c.bike[key].forEach((v,j)=>{c.bike[`field${(offset+j*4).toString(16)}`]=v;});
  return result;
 });
 return [...words,...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),floatBits(angle)];
}
