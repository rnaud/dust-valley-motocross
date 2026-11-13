import {evaluateBikeReset} from './bike-reset-case.mjs';
import {resetMcmBikePose} from '../../src/physics/mcm/reset-pose.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateResetFull(input){
 const p=structuredClone(input),nodes=p.nodes;
 nodes.forEach((n,i)=>{const parent=p.parents[i];if(parent>=0){n.parent=nodes[parent];n.nextSibling=n.parent.firstChild;n.parent.firstChild=n;}});
 const t=p.terrain;
 const leaf={level:0,bias:t.bias,scale:t.scale,heights:Array.from({length:289},(_,j)=>(t.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>t.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
 const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
 t.root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][t.mode];
 const g=p.collision;
 const cells=Array.from({length:65},(_,i)=>({id:1000+i})),markers=cells.map((cell,i)=>({id:2000+i,previous:cell}));
 cells.forEach((cell,i)=>{cell.next=markers[i];});
 const entries=g.oldCells.map((cell,i)=>({id:i+1,cell,active:g.active[i],owner:123,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const object={...g,entries};
 let angle,points,heights,resetFlags;
 const words=evaluateBikeReset(p,c=>{
  Object.assign(c,{bodyNode:nodes[p.bodyIndex],componentNode:nodes[p.componentIndex],pose:p.pose,componentAxis:p.componentAxis,componentAngle:p.componentAngle,frontNode:nodes[p.frontIndex],rearNode:nodes[p.rearIndex],terrain:t,points:p.points,heights:p.heights,frontRadius:bitsFloat(p.words[818+0x44/4]),rearRadius:bitsFloat(p.words[842+0x44/4]),contactScratch:p.contactScratch,referenceNode:nodes[p.referenceIndex],bounds:{...p.bounds,components:nodes},collision:g.present?object:null,proxy:nodes[g.proxyIndex],grid:{...g,cells},gridEnabled:g.enabled});
  const result=resetMcmBikePose(c);resetFlags=[c.bike.field8c0,c.bike.fieldcb4];angle=c.componentAngle;points=c.points;heights=c.heights;
  for(const [key,offset] of [['savedPosition',0x56c],['boundsMin',0x218],['boundsMax',0x224],['forward',0x4c0],['up',0x4cc],['position',0x4f8],['tangent',0x578],['rearTangent',0x584],['normal',0x54c],['offset',0x540],['referencePosition',0x504]])c.bike[key].forEach((v,j)=>{c.bike[`field${(offset+j*4).toString(16)}`]=v;});
  return result;
 });
 words[0x8c0/4]=resetFlags[0]>>>0;words[0xcb4/4]=resetFlags[1]>>>0;
 const id=x=>x?.id||0;
 const collisionOutput=[...object.matrix.map(floatBits),object.other||0,...object.worldCenter.map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)])];
 return [...words,...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),floatBits(angle),...[...points.flat(),...heights,...p.bounds.children.flatMap(r=>[...r.forward,...r.up,...r.position])].map(floatBits),...collisionOutput];
}
