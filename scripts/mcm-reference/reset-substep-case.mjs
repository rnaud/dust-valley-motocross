import {evaluateBikeReset} from './bike-reset-case.mjs';
import {resetMcmSubstep} from '../../src/physics/mcm/reset-substep.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';
export function evaluateResetSubstep(input,step=resetMcmSubstep){
 const p=structuredClone(input),nodes=p.nodes;
 nodes.forEach((n,i)=>{const parent=p.parents[i];if(parent>=0){n.parent=nodes[parent];n.nextSibling=n.parent.firstChild;n.parent.firstChild=n;}});
 const t=p.terrain;
 const leaf={level:0,bias:t.bias,scale:t.scale,heights:Array.from({length:289},(_,j)=>(t.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>t.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
 const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
 t.root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][t.mode];
 const g=p.collision;
 const cells=Array.from({length:65},(_,i)=>({id:1000+i})),markers=cells.map((cell,i)=>({id:2000+i,previous:cell,owner:g.markerOwner??0}));
 cells.forEach((cell,i)=>{cell.next=markers[i];});
 const entries=g.oldCells.map((cell,i)=>({id:i+1,cell,active:g.active[i],owner:g.owner??123,other:77+i}));
 for(const e of entries)if(e.active){let tail=cells[e.cell];while(tail.next)tail=tail.next;tail.next=e;e.previous=tail;}
 const object={...g,entries};
 const q=p.selection;
 const others=Array.from({length:4},(_,j)=>({position:q.slice(12+j*4,15+j*4),fieldc30:q[15+j*4]}));
 const targetNodes=Array.from({length:2},(_,j)=>({local:q.slice(48+j*33,64+j*33),world:q.slice(64+j*33,80+j*33),cacheValid:q[80+j*33]}));
 if(q[114]){targetNodes[1].parent=targetNodes[0];targetNodes[0].firstChild=targetNodes[1];}
 let angle,points,heights,resetFlags,selectedPose,controls,cooldownFlag;
 const words=evaluateBikeReset(p,c=>{
  Object.assign(c,{bodyNode:nodes[p.bodyIndex],componentNode:nodes[p.componentIndex],pose:p.pose,componentAxis:p.componentAxis,componentAngle:p.componentAngle,frontNode:nodes[p.frontIndex],rearNode:nodes[p.rearIndex],terrain:t,points:p.points,heights:p.heights,frontRadius:bitsFloat(p.words[818+0x44/4]),rearRadius:bitsFloat(p.words[842+0x44/4]),contactScratch:p.contactScratch,referenceNode:nodes[p.referenceIndex],bounds:{...p.bounds,components:nodes},collision:g.present?object:null,proxy:nodes[g.proxyIndex],grid:{...g,cells},gridEnabled:g.enabled});
  Object.assign(c.bike,{fieldbb8:q[5],field88c:q[6],field614:q[8],fieldc08:q[9],fieldbe4:q[10],savedHeading:q.slice(28,31),spawnPosition:q.slice(31,34),spawnForward:q.slice(34,37),position:q.slice(37,40),forward:q.slice(40,43),up:q.slice(43,46)});
  Object.assign(c,{mode:q[0],setting:q[1],playerCount:q[2],aiCount:q[3],enumerationDisabled:q[4],resetReason:q[7],width:q[11],bikes:[c.bike,...others.slice(0,q[2]-1+q[3])],targetNode:q[46]?targetNodes[1-q[47]]:null,observerBike:q[115]===1?c.bike:q[115]===2?others[0]:null,control1c:q[116],control30:q[117],control2c:q[118]});
  const result=step(c);selectedPose=[...c.pose.position,...c.pose.forward];controls=[c.control1c,c.control30,c.control2c,c.resetReason];cooldownFlag=c.bike.field8ac;resetFlags=[c.bike.field8c0,c.bike.fieldcb4];angle=c.componentAngle;points=c.points;heights=c.heights;
  for(const [key,offset] of [['savedHeading',0x898],['spawnPosition',0xbc0],['spawnForward',0xbcc],['savedPosition',0x56c],['boundsMin',0x218],['boundsMax',0x224],['forward',0x4c0],['up',0x4cc],['position',0x4f8],['tangent',0x578],['rearTangent',0x584],['normal',0x54c],['offset',0x540],['referencePosition',0x504]])c.bike[key].forEach((v,j)=>{c.bike[`field${(offset+j*4).toString(16)}`]=v;});
  return result;
 });
 words[0x8c0/4]=resetFlags[0]>>>0;words[0xcb4/4]=resetFlags[1]>>>0;
 words[0xbb8/4]=q[5];words[0x614/4]=q[8];words[0xc08/4]=q[9];words[0xbe4/4]=q[10];
 if(q[115]!==1)words[0x8ac/4]=cooldownFlag>>>0;
 const id=x=>x?.id||0;
 const collisionOutput=[...object.matrix.map(floatBits),(typeof object.other==='object'?object.other?.token||0:object.other||0),...object.worldCenter.map(floatBits),...entries.flatMap(e=>[id(e.previous),id(e.next),e.owner,e.cell,e.other,e.active]),...cells.flatMap((cell,i)=>[id(cell.next),id(markers[i].previous),id(markers[i].next)])];
 return [...words,...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),floatBits(angle),...[...points.flat(),...heights,...p.bounds.children.flatMap(r=>[...r.forward,...r.up,...r.position])].map(floatBits),...collisionOutput,...selectedPose.map(floatBits),...controls,...others.flatMap(o=>[...o.position.map(floatBits),o.fieldc30]),...targetNodes.flatMap(n=>[...n.local.map(floatBits),...n.world.map(floatBits),n.cacheValid])];
}
