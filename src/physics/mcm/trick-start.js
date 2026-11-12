import {createMcmEventGraph,resetMcmEventOrientation} from './event-graph.js';

// Original 0x4a1970 with orientation/child callbacks and both 0x430a20
// animation selectors. Animation record pointers are represented as indices.
export function startMcmTrick(c){
 const s=c.setup,r={...createMcmEventGraph(s),field820:c.field820,field710:1,animation:c.trickIndex&255,awardBase:0,fieldb4c:0,envelope:[0,Math.fround(c.time*21),1,-1],boundsMin:[...s.liveBoundsMin],boundsMax:[...s.liveBoundsMax],scratch540:[...s.scratch540],scratch54c:[...s.scratch54c]};
 if(r.field820)resetMcmEventOrientation(r,s);
 // Original animation object +4, +10, +14, +30, +2c.
 r.bikeAnimation=[0,c.trickIndex+1,c.bikeAnimationRecords[c.trickIndex],0,0];
 r.riderAnimation=[0,c.trickIndex+1,c.riderAnimationRecords[c.trickIndex],0,0];
 return r;
}
