import {evaluateResetEventJoin} from './reset-event-join-case.mjs';
import {updateMcmResetRider} from '../../src/physics/mcm/reset-rider.js';

export function evaluateResetRider(input,step=updateMcmResetRider){
 let b;
 const words=evaluateResetEventJoin(input,c=>{
  b=c.bike;c.riderComponentLimit=input.riderComponentLimit;
  b.fieldbfc=input.words[0xbfc/4]|0;b.field618=input.words[0x618/4]|0;
  return step(c);
 });
 for(const offset of [0xbfc,0x618])words[offset/4]=b[`field${offset.toString(16)}`]>>>0;
 return words;
}
