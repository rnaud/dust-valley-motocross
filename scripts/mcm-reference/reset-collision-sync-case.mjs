import {evaluateResetPostState} from './reset-post-state-case.mjs';
import {updateMcmResetCollisionSync} from '../../src/physics/mcm/reset-collision-sync.js';

export function evaluateResetCollisionSync(input,step=updateMcmResetCollisionSync){
 return evaluateResetPostState(input,step);
}
