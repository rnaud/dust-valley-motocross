import {updateMcmPostStateSubstep} from './post-state-substep.js';
import {synchronizeMcmCollisionState} from './collision-substep.js';

// Continuous prefix through 0x4ac81b, or 0x4ac89e with no collision object.
export function updateMcmCollisionSyncSubstep(c){
 const result=updateMcmPostStateSubstep(c),s=c.collisionSync;
 synchronizeMcmCollisionState({bike:{transform:c.bodyNode},collision:s.present?s.object:null,proxy:s.proxy,grid:s.grid,gridEnabled:s.gridEnabled});
 return result;
}
