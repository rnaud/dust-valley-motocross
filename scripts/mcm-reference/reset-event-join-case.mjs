import {evaluateResetEventSetup} from './reset-event-setup-case.mjs';
import {updateMcmResetEventJoin} from '../../src/physics/mcm/reset-event-join.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function evaluateResetEventJoin(input,step=updateMcmResetEventJoin){
 let s;
 const words=evaluateResetEventSetup(input,c=>{const result=step(c);s=c.contactPhase.normalEventJoin;return result;});
 return [...words,s.called,...[s.height,s.control,s.dt].map(floatBits)];
}
