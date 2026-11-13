import {evaluateResetLoopControls} from './reset-loop-controls-case.mjs';
import {continueMcmResetLoopEvent} from '../../src/physics/mcm/reset-loop-event.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopEvent(input){
 let tail=Array(188).fill(0);
 const words=evaluateResetLoopControls(input,(c,{looped})=>{
  if(!looped)return;
  continueMcmResetLoopEvent(c);const b=c.bike,p=c.contactPhase,r=c.rider,j=p.normalEventJoin,d=p.normalEventDecision;
  tail=[j.called?1:2];
  for(const v of [b.velocity,b.angularVelocity,b.normal,b.offset])tail.push(...Array.from(v,floatBits));
  for(const field of ['844','8b8','8b4','8b0','710','714','820','814','8a4','890','884','8c8'])tail.push(['890','8c8'].includes(field)?floatBits(b[`field${field}`]):field==='8b0'?+!!b.field8b0:b[`field${field}`]>>>0);
  tail.push(...Array.from(b.savedHeading,floatBits),...Array.from(c.effect,floatBits));
  for(const v of [r.previousVelocity,r.velocity,r.angularVelocity])tail.push(...Array.from(v,floatBits));
  tail.push(r.flag13c>>>0,r.field140>>>0,...r.selected.map(v=>v>>>0),r.active16c>>>0,r.kind>>>0);
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(d.triggered,d.inputCalls,d.randomCalls,j.called,p.control20,floatBits(j.height),floatBits(j.control),floatBits(j.dt));
 });return [...words,...tail];
}
