import {calculateMcmSuspension} from './suspension.js';

// Original 0x4a9bbf..0x4a9d5c. The force helper's compression argument is the
// travel output of each response, not its residual height/compression output.
// Inactive responses clear force while leaving damping scratch output untouched.
export function calculateMcmSuspensionForces({first,second,mass,extraStiffness}) {
  const calculate=(c,extra)=>c.active
    ?calculateMcmSuspension({...c,mass,compression:c.travel,extraStiffness:extra})
    :{force:[0,0,0],dampingForce:[...c.dampingForce]};
  return {first:calculate(first,0),second:calculate(second,extraStiffness)};
}
