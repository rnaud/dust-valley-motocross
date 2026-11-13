import {evaluateResetCollisionDispatch} from './reset-collision-dispatch-case.mjs';
import {updateMcmResetFinishedSubstep} from '../../src/physics/mcm/reset-finished-substep.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetFinishedSubstep(input){
 let c;
 const words=evaluateResetCollisionDispatch(input,state=>{c=state;return updateMcmResetFinishedSubstep(c);});
 return [...words,floatBits(c.contactPhase.dt),floatBits(c.contactPhase.turnScale),c.finishPrior.remaining>>>0,floatBits(c.finishPrior.carry)];
}
