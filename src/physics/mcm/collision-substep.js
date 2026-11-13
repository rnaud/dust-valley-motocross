import {resolveMcmWorldMatrix} from './world-transform.js';
import {setMcmWorldMatrix} from './proxy-transform.js';
import {updateMcmCollisionGrid} from './collision-grid.js';
import {dispatchMcmCollisions} from './collision-dispatch.js';

// Original 0x4ac7c4..0x4ac89e. The dispatcher traverses live grid entries;
// callbacks may update the same bike, proxy, grid and event state in place.
export function updateMcmCollisionSubstep(c){
 const {bike,collision,manager}=c;
 synchronizeMcmCollisionState(c);
 if(!collision)return;
 if(bike.field8a8){bike.field8a8=0;return;}
 const previousState=bike.state844;
 dispatchMcmCollisions(manager,collision.owner);
 if(bike.state844&&!previousState){c.remaining=1;bike.carry=0;}
}

// Original common proxy/grid preparation before collision dispatch.
export function synchronizeMcmCollisionState({bike,collision,proxy,grid,gridEnabled}){
 if(!collision){setMcmWorldMatrix(proxy,resolveMcmWorldMatrix(bike.transform));return;}
 collision.other=null;
 collision.matrix=[...resolveMcmWorldMatrix(bike.transform)];
 setMcmWorldMatrix(proxy,collision.matrix);
 updateMcmCollisionGrid(collision,grid,gridEnabled);
}
