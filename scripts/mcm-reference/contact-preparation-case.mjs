import {beginMcmSubstep} from '../../src/physics/mcm/contact-preparation.js';
import {floatBits} from '../../src/physics/mcm/math.js';
import {encodeSubstepStart,substepStartWords} from './substep-start-case.mjs';
export function encodeContactPreparation(c){
 const p=c.preparation;
 return [...encodeSubstepStart(c),...p.nodes.flatMap(n=>[...n.local,...n.world,n.cacheValid]),...p.parents,p.front,p.rear,p.positionNode,...p.restLocal,p.frontLimited,p.rearLimited,...p.position,...p.scratch.flat()];
}
export function evaluateContactPreparation(input){
 const c=structuredClone(input),p=c.preparation,nodes=p.nodes;
 nodes.forEach((node,i)=>{const index=p.parents[i];if(index>=0){const parent=nodes[index];node.parent=parent;node.nextSibling=parent.firstChild;parent.firstChild=node;}});
 c.suspension={front:{node:nodes[p.front],limited:p.frontLimited},rear:{node:nodes[p.rear],limited:p.rearLimited,restLocal:p.restLocal},positionNode:nodes[p.positionNode],scratch:p.scratch};
 const r=beginMcmSubstep(c);
 return [...substepStartWords(c,r),...nodes.flatMap(n=>[...[...n.local,...n.world].map(floatBits),n.cacheValid]),c.suspension.front.limited,c.suspension.rear.limited,...c.referencePosition.map(floatBits),...r.contacts.scratch.flat().map(floatBits)];
}
