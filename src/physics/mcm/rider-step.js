import {updateMcmRider} from './rider-update.js';
import {createMcmEventGraph,resetMcmEventOrientation} from './event-graph.js';
import {startMcmTrick} from './trick-start.js';
import {startMcmNearbyInteraction} from './nearby-transition.js';

// Connected 0x4aecb0 with recovered transitions. Input queries and animation
// assets are supplied by the caller; graph mutations are returned with the state.
export function updateMcmRiderStep(c){
 const s=c.setup,n=c.nearby;
 const initial={...c.control,...createMcmEventGraph(s),field820:c.control.enabled,animation:c.animation,awardBase:c.awardBase,bikeAnimation:[...c.bikeAnimation],riderAnimation:[...c.riderAnimation],boundsMin:[...s.liveBoundsMin],boundsMax:[...s.liveBoundsMax],scratch540:[...s.scratch540],scratch54c:[...s.scratch54c],nearby:null,accepted:false,angle:n.angle,lean:n.lean,progress:n.progress,field824:n.field824};
 const r=updateMcmRider(initial,{
  query:c.query,
  nearby(r){
   Object.assign(r,startMcmNearbyInteraction({...c,...n,field820:r.enabled,field710:r.field710,fieldb4c:r.fieldb4c}));r.enabled=r.field820;
  },
  trick(r,trickIndex){
   Object.assign(r,startMcmTrick({...c,trickIndex,field820:r.enabled,fieldb4c:r.fieldb4c}));r.enabled=r.field820;
  },
  resetOrientation(r){resetMcmEventOrientation(r,s);}
 });
 r.field820=r.enabled;
 return r;
}
