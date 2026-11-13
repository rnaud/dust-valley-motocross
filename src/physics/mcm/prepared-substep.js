import {updateMcmFinishedSubstep} from './finished-substep.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

// Original common preparation 0x4a5e27..0x4a5ea5, before reset selection.
export function prepareMcmSubstep(c){
 c.frontSuspension.limited=0;
 c.frontSuspension.node.local.splice(12,3,0,0,0);invalidateMcmTransform(c.frontSuspension.node);
 c.rearSuspension.limited=0;
 c.rearMountNode.local=[...c.entryPreparation.rearRestMatrix];invalidateMcmTransform(c.rearMountNode);
 // 0x40ded0 is a no-op constructor: caller scratch survives this boundary.
 c.balanceCenter=resolveMcmWorldMatrix(c.balanceNode).slice(12,15);
}

export function updateMcmPreparedSubstep(c){
 prepareMcmSubstep(c);
 return updateMcmFinishedSubstep(c);
}
