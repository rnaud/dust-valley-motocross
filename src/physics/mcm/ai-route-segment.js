import {findMcmNearestAiRoute} from './ai-route-nearest.js';
import {mcmInverseSqrtSeed} from './inverse-sqrt.js';
import {mcmSubtract as sub,mcmMultiply as mul,mcmAdd as add} from './x87-arithmetic.js';

// Original 0x46d3c2..0x46d535: nearest search and segment setup only.
// The earlier controller handles empty routes; race adjustments follow this region.
export function selectMcmAiRouteSegment({head,nodes,table,x,z}){
 if(!head||!table.length)throw Error('AI segment requires a nonempty route');
 const nearest=findMcmNearestAiRoute({head,nodes,x,z}),node=nodes.get(nearest.address);
 const nextAddress=node.next||head,previousAddress=table[nearest.index?nearest.index-1:table.length-1];
 const next=nodes.get(nextAddress);if(!next||!nodes.has(previousAddress))throw Error('Missing AI segment neighbor');
 const dx=sub(next.x,node.x),dz=sub(next.z,node.z),squared=Math.fround(add(mul(dz,dz),mul(dx,dx)));
 return {...nearest,next:nextAddress,previous:previousAddress,inverseLength:mcmInverseSqrtSeed(squared),speed:Math.fround(mul(node.speed,.5)),class27:node.kind===2||node.kind===7,class3456:[3,4,5,6].includes(node.kind)};
}
