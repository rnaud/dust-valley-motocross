import {evaluateResetNextSteering} from './reset-next-steering-case.mjs';
import {decideMcmFrameReset} from '../../src/physics/mcm/frame-reset-decision.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextReset(input,observe){
 let words=Array(155).fill(0),resetBranch='pending';
 const result=evaluateResetNextSteering(input,(c,reached)=>{
  if(!reached)return;
  const b=c.bike,r=c.rider,before=[r.field154>>>0,floatBits(r.fieldf8),r.field138>>>0,r.field144>>>0];
  c.resetDecision={setting:input.selection[1],mode:input.selection[0],worldScale:input.selection[11],controllerPresent:true,queryReset:()=>input.frameReset.pressed};
  const decision=decideMcmFrameReset(c,c.frameEntry.rawDelta);resetBranch=decision.branch;
  words=[1,...before,decision.code,b.field844>>>0,b.field8b0>>>0,b.field884>>>0,b.fieldc40>>>0,...Array.from(b.position,floatBits),r.field154>>>0,floatBits(r.fieldf8),r.field138>>>0,r.flag13c>>>0,r.field140>>>0,r.field144>>>0,r.active16c>>>0,decision.queries,decision.cleanupCalls,0];
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  if(observe)observe(c,decision);
 });
 return {...result,tail:[...result.tail,...words],resetBranch};
}
