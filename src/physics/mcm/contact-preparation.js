import {invalidateMcmTransform} from './event-orientation.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
import {updateMcmSubstepStart} from './substep-start.js';

// Original 0x4a5e27..0x4a5ea5. The front reset clears translation only;
// the rear reset restores its saved local matrix. Both invalidate descendants
// only when their node was cached, preserving the original early-out rule.
export function prepareMcmContactTransforms(c){
 c.front.limited=0;c.front.node.local.splice(12,3,0,0,0);
 invalidateMcmTransform(c.front.node);
 c.rear.limited=0;c.rear.node.local=[...c.rear.restLocal];
 invalidateMcmTransform(c.rear.node);
 // The seven vector constructor calls are no-ops; preserve their storage.
 return {position:resolveMcmWorldMatrix(c.positionNode).slice(12,15),scratch:c.scratch};
}

// Continuous start-of-substep ordering before the contact-query branches.
export function beginMcmSubstep(c){
 const engine=updateMcmSubstepStart(c);
 const contacts=prepareMcmContactTransforms(c.suspension);
 c.referencePosition=contacts.position;
 return {...engine,contacts};
}
