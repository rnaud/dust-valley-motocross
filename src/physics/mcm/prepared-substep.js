import {updateMcmFinishedSubstep} from './finished-substep.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {resolveMcmWorldMatrix} from './world-transform.js';

// Original ordinary (no reset request) entry 0x4a5e27..0x4a63d2,
// connected through the completed substep at 0x4ac94b.
export function updateMcmPreparedSubstep(c){
 c.frontSuspension.limited=0;
 c.frontSuspension.node.local.splice(12,3,0,0,0);invalidateMcmTransform(c.frontSuspension.node);
 c.rearSuspension.limited=0;
 c.rearMountNode.local=[...c.entryPreparation.rearRestMatrix];invalidateMcmTransform(c.rearMountNode);
 for(const index of [0,1,8,9])c.points[index]=[0,0,0];
 c.balanceCenter=resolveMcmWorldMatrix(c.balanceNode).slice(12,15);
 return updateMcmFinishedSubstep(c);
}
