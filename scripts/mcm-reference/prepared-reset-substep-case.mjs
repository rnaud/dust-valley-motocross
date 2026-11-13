import {evaluateResetSubstep} from './reset-substep-case.mjs';
import {updateMcmPreparedResetSubstep} from '../../src/physics/mcm/prepared-reset-substep.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';

export function evaluatePreparedResetSubstep(input){
 let frontLimit,rearLimit;
 const words=evaluateResetSubstep(input,c=>{
  const nodes=c.bounds.components,p=input.preparation;
  c.suspension={
   front:{node:nodes[p.frontIndex],limited:input.words[866+0x44/4]},
   rear:{node:nodes[p.rearIndex],limited:input.words[890+0x44/4],restLocal:input.words.slice(891,907).map(bitsFloat)},
   positionNode:c.referenceNode,
  };
  const result=updateMcmPreparedResetSubstep(c);
  frontLimit=c.suspension.front.limited;rearLimit=c.suspension.rear.limited;
  return result;
 });
 // Suspension preparation clears component+44, independently of reset+4c.
 words[866+0x44/4]=frontLimit>>>0;words[890+0x44/4]=rearLimit>>>0;
 return words;
}
