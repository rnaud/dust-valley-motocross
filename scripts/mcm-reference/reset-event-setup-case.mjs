import {evaluateResetEventDecision} from './reset-event-decision-case.mjs';
import {updateMcmResetEventSetup} from '../../src/physics/mcm/reset-event-setup.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function resetRiderScratch(c){
 const r=c.rider,s=c.contactPhase.normalEventSetup;
 return [...r.previousVelocity,...r.velocity,...r.angularVelocity,r.flag13c,r.field140,...r.selected,r.active16c,r.kind,
  ...s.randomValues,...s.records.flatMap(groups=>groups.flatMap(values=>[values.length,...values,...Array(5-values.length).fill(0)]))];
}
export function evaluateResetEventSetup(input,step=updateMcmResetEventSetup){
 let b,r;
 const integers=[0x8a4,0x878,0x880];
 const words=evaluateResetEventDecision(input,c=>{
  b=c.bike;r=c.rider=structuredClone(input.rider);
  for(const offset of integers)b[`field${offset.toString(16)}`]=input.words[offset/4]|0;
  c.contactPhase.contactCorrection.controller170=r.kind;c.contactPhase.contactCorrection.controller140=r.field140;
  return step(c);
 });
 for(const offset of [...integers,0x884,0x844,0x820])words[offset/4]=b[`field${offset.toString(16)}`]>>>0;
 return [...words,...Array.from(r.previousVelocity,floatBits),...Array.from(r.velocity,floatBits),...Array.from(r.angularVelocity,floatBits),r.flag13c>>>0,r.field140>>>0,...r.selected.map(v=>v>>>0),r.active16c>>>0,r.kind>>>0];
}
