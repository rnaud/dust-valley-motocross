import {queryMcmSubstepWheelContacts} from '../../src/physics/mcm/wheel-contact-frame.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateSubstepWheelQuery(input){
 const c=structuredClone(input),t=c.terrain;
 const leaf={level:0,bias:t.bias,scale:t.scale,heights:Array.from({length:289},(_,j)=>(t.base+j*137)&65535),normals:Array.from({length:289},(_,j)=>t.normals[(j%17%2)+2*(Math.floor(j/17)%2)])};
 const child={level:1,children:Array(256).fill(leaf)},parent={level:2,children:Array(256).fill(child)};
 t.root=[leaf,child,parent,{level:1},{level:1,children:Array(256).fill(null)},null][t.mode];
 c.node=c.nodes[0];c.nodes.forEach((n,i)=>{n.parent=c.parents[i]<0?null:c.nodes[c.parents[i]];});c.frontNode=c.nodes[c.frontIndex];c.rearNode=c.nodes[c.rearIndex];
 const r=queryMcmSubstepWheelContacts(c);
 return [...[...c.points.flat(),...c.heights,...c.tangent,...c.normal,...c.offset,...c.node.local,...c.node.world].map(floatBits),c.node.cacheValid,...[...r.resampleNormal,...r.forward,...c.rearTangent,...r.rearResampleNormal,...r.probePoints.flat(),...r.probeNormals.flat(),...r.refinedNormals.flat(),...r.refinedTangents.flat()].map(floatBits),...c.nodes.slice(1).flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),floatBits(c.field6b0)];
}
