import {floatBits} from './math.js';
import {mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';

// Original 0x4ad310–0x4ad3e7. Limits a contact force by the available
// velocity change and consumes that budget. Inputs use original units.
export function limitMcmContactForce({mass,dt,remaining,requested,magnitude,force}) {
  // Match x87 invalid arithmetic stores for zero-step/overflowed state.
  const f=Math.fround;
  let change=!(remaining>=requested)?remaining:requested;
  if((floatBits(change)|0)<=0)change=0;
  const massOverDt=div(mass,dt),limit=mul(massOverDt,change);
  if(limit>=magnitude) {
    return {force:[...force],magnitude,remaining:f(sub(remaining,div(magnitude,f(massOverDt))))};
  }
  const limited=f(limit),scale=div(limited,magnitude);
  return {force:force.map(v=>f(mul(v,scale))),magnitude:limited,remaining:f(sub(remaining,change))};
}
