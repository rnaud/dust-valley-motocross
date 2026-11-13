import {evaluateCollisionDispatchSubstep} from './collision-dispatch-substep-case.mjs';
import {updateMcmFinishedSubstep} from '../../src/physics/mcm/finished-substep.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateFinishedSubstep(input){
 let tail;
 const prefix=evaluateCollisionDispatchSubstep(input,c=>{
  const r=updateMcmFinishedSubstep(c);
  tail=[floatBits(c.dt),floatBits(c.turnScale),...Array.from(c.bikeForward,floatBits),...Array.from(c.bikeUp,floatBits),floatBits(c.heading),floatBits(c.pitch),floatBits(c.roll),floatBits(c.sinRoll),floatBits(c.cosRoll),floatBits(c.cosPitch)];
  return r;
 });
 return [...prefix,...tail];
}
