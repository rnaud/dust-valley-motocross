import {floatBits,bitsFloat} from './math.js';

// Original 0x4ad310–0x4ad3e7. Limits a contact force by the available
// velocity change and consumes that budget. Inputs use original units.
export function limitMcmContactForce({mass,dt,remaining,requested,magnitude,force}) {
  // Match x87 invalid arithmetic stores for zero-step/overflowed state.
  const f=value=>Number.isNaN(value)?bitsFloat(0xffc00000):Math.fround(value);
  let change=remaining<requested?remaining:requested;
  if((floatBits(change)|0)<=0)change=0;
  const massOverDt=mass/dt,limit=massOverDt*change;
  if(limit>=magnitude) {
    return {force:[...force],magnitude,remaining:f(remaining-magnitude/f(massOverDt))};
  }
  const limited=f(limit),scale=limited/magnitude;
  return {force:force.map(v=>f(v*scale)),magnitude:limited,remaining:f(remaining-change)};
}
