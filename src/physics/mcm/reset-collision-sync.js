import {updateMcmResetPostState} from './reset-post-state.js';
import {synchronizeMcmCollisionState} from './collision-substep.js';

// Reset through collision proxy/grid synchronization, before dispatch.
export function updateMcmResetCollisionSync(c){
 const result=updateMcmResetPostState(c);
 synchronizeMcmCollisionState({bike:{transform:c.bodyNode},collision:c.collision,
  proxy:c.proxy,grid:c.grid,gridEnabled:c.gridEnabled});
 return result;
}
