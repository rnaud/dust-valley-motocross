import {evaluateBikeReset} from './bike-reset-case.mjs';
import {queryMcmResetContacts} from '../../src/physics/mcm/reset-pose.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateResetContacts(input){
 const p=structuredClone(input),nodes=p.nodes;
 nodes.forEach((n,i)=>{const parent=p.parents[i];if(parent>=0){n.parent=nodes[parent];n.nextSibling=n.parent.firstChild;n.parent.firstChild=n;}});
 const t=p.terrain;
 const leaf={level:0,bias:t.bias,scale:t.scale,heights:Array.from({length:289},(_,j)=>(t.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>t.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
 const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
 t.root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][t.mode];
 let angle,points,heights;
 const words=evaluateBikeReset(p,c=>{
  Object.assign(c,{bodyNode:nodes[p.bodyIndex],componentNode:nodes[p.componentIndex],pose:p.pose,componentAxis:p.componentAxis,componentAngle:p.componentAngle,frontNode:nodes[p.frontIndex],rearNode:nodes[p.rearIndex],terrain:t,points:p.points,heights:p.heights,frontRadius:bitsFloat(p.words[818+0x44/4]),rearRadius:bitsFloat(p.words[842+0x44/4]),contactScratch:p.contactScratch});
  const result=queryMcmResetContacts(c);angle=c.componentAngle;points=c.points;heights=c.heights;
  for(const [key,offset] of [['forward',0x4c0],['up',0x4cc],['position',0x4f8],['tangent',0x578],['rearTangent',0x584],['normal',0x54c],['offset',0x540]])c.bike[key].forEach((v,j)=>{c.bike[`field${(offset+j*4).toString(16)}`]=v;});
  return result;
 });
 return [...words,...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),floatBits(angle),...[...points.flat(),...heights].map(floatBits)];
}
