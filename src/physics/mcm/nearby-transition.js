import {evaluateMcmNearbyInteraction} from './nearby-bike.js';
import {createMcmEventGraph,resetMcmEventOrientation} from './event-graph.js';
import {seekMcmAnimation,applyMcmAnimationChild} from './animation-seek.js';
import {floatBits} from './math.js';

// Complete 0x4a16d0 transition. The caller supplies animation objects/records
// and callbacks, matching the original virtual dispatch on bike and rider.
export function startMcmNearbyInteraction(c){
 const s=c.setup,r={...createMcmEventGraph(s),field820:c.field820,field710:c.field710,field824:c.field824,fieldb4c:c.fieldb4c,animation:c.animation,angle:c.angle,lean:c.lean,progress:c.progress,envelope:[...s.envelope],boundsMin:[...s.liveBoundsMin],boundsMax:[...s.liveBoundsMax],scratch540:[...s.scratch540],scratch54c:[...s.scratch54c]};
 const gate=evaluateMcmNearbyInteraction(c.world,c.self,c.heading,c.angle);
 r.nearby=gate.bike;r.angle=gate.angle;r.accepted=gate.accepted;
 if(!gate.accepted)return r;
 r.envelope=[0,Math.fround(c.time*21),1,-1];
 resetMcmEventOrientation(r,s);
 r.field710=1;r.field824=1;r.fieldb4c=0;r.animation=255;
 if((floatBits(r.angle)|0)>0x402ccccd){r.angle=Math.fround(2.7);r.lean=Math.fround(.7);}
 else if(floatBits(r.angle)>0xc02ccccd){r.angle=Math.fround(-2.7);r.lean=Math.fround(-.7);}
 else r.lean=Math.fround(r.angle*Math.fround(.36963)*Math.fround(.7));
 r.progress=0;
 c.seekAnimations(r);
 return r;
}

// Shared animation wiring when both objects reference a supplied component graph.
export function seekMcmInteractionAnimations(r,rider,bikeRecord,riderRecord,positionFlags){
 const components=r.components.map((node,i)=>({node,positionEnabled:positionFlags[i]}));
 const callback=child=>applyMcmAnimationChild(r.target,components,child);
 seekMcmAnimation(rider,riderRecord,.5,callback);
 seekMcmAnimation(r,bikeRecord,.5,callback);
}
