import {applyMcmBikePostState} from './reset-post-state.js';
import {applyMcmBikeCollisionSync} from './reset-collision-sync.js';
import {applyMcmBikeCollisionDispatch} from './reset-collision-dispatch.js';
import {applyMcmBikeSubstepFinish} from './reset-finished-substep.js';

// Complete the same second iteration, including its live collision grid.
export function continueMcmResetLoopFinish(c){
 applyMcmBikePostState(c);applyMcmBikeCollisionSync(c);
 applyMcmBikeCollisionDispatch(c);applyMcmBikeSubstepFinish(c);
}
