import {evaluateResetAlignment} from './reset-alignment-case.mjs';
import {updateMcmResetEventDecision} from '../../src/physics/mcm/reset-event-decision.js';

export function evaluateResetEventDecision(input,step=updateMcmResetEventDecision){
 let p,b;
 const integers=[0xc40,0x8ac,0x8b4,0x8b8];
 const words=evaluateResetAlignment(input,c=>{
  b=c.bike;for(const offset of integers)b[`field${offset.toString(16)}`]=input.words[offset/4]|0;
  const result=step(c);p=c.contactPhase;return result;
 });
 for(const offset of [...integers,0x8b0,0x710,0x714])words[offset/4]=b[`field${offset.toString(16)}`]>>>0;
 return [...words,p.normalEventDecision.triggered,p.normalEventDecision.inputCalls,p.normalEventDecision.randomCalls];
}
