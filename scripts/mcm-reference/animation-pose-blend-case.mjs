import {applyMcmAnimationChild} from '../../src/physics/mcm/animation-seek.js';
import {blendMcmAnimationPoses,blendMcmFourAnimationPoses} from '../../src/physics/mcm/animation-pose-blend.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function evaluateAnimationPoseBlend(c){
 const nodes=c.nodes.map(n=>({...n,local:[...n.local],world:[...n.world]}));
 nodes[0].parent=nodes[c.targetParent];nodes[c.targetParent].firstChild=nodes[0];
 if(c.bodyParent){nodes[1].parent=nodes[2];nodes[1].nextSibling=nodes[2].firstChild;nodes[2].firstChild=nodes[1];}
 const components=[];components[c.componentIndex]={node:nodes[0],positionEnabled:c.positionEnabled};
 const children=[],records=[];
 for(let r=0;r<(c.thirdCount?4:2);r++){
  const count=[c.frameCount,c.secondCount,c.thirdCount,c.fourthCount][r],frames=[];
  for(let j=0;j<8;j++){
   const list=Array.from({length:2},(_,k)=>{
    const n=(r*8+j)*3+k;
    return {componentIndex:c.componentIndex,local:(c.local+r+j+k)%2,
     forward:c.forward.map((v,a)=>f(v+n*.125*(a+1))),up:c.up.map((v,a)=>f(v-n*.0625*(a+1))),position:c.position.map((v,a)=>f(v+n*.25*(a+1)))};
   });
   if(count%2===0)list[0].next=list[1];children.push(...list);
   frames.push({index:j,firstChild:(c.presentMask>>(r*2+j%2))&1?list[0]:null,
    boundsMin:c.position.map((v,k)=>f(v+(r*8+j)*(k+1))),boundsMax:c.position.map((v,k)=>f(v+(r*8+j)*(k+4)))});
  }
  for(let j=0;j<count-1;j++)frames[j].next=frames[j+1];
  records.push({frameCount:count,firstFrame:frames[0]});
 }
 const object={};
 const apply=child=>applyMcmAnimationChild(nodes[1],components,child);
 if(c.thirdCount)blendMcmFourAnimationPoses(object,records,c.fraction,c.blend,c.secondaryBlend,apply);
 else blendMcmAnimationPoses(object,...records,c.fraction,c.blend,apply);
 return [...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),object.frame.index,+(object.record===records.at(-1)),...[...object.boundsMin,...object.boundsMax].map(floatBits),...children.flatMap(child=>[...child.forward,...child.up,...child.position].map(floatBits))];
}
