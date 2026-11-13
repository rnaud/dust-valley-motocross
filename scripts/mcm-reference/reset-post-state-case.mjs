import {evaluateResetRider} from './reset-rider-case.mjs';
import {updateMcmResetPostState} from '../../src/physics/mcm/reset-post-state.js';

export function evaluateResetPostState(input,step=updateMcmResetPostState){
 let p;
 const words=evaluateResetRider(input,c=>{const result=step(c);p=c.postState;return result;});
 return [...words,+p.awardCalled];
}
