import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';

// Original front 0x4b1870 and rear 0x4b1960. Coefficient names retain bike
// offsets until their configuration fields are fully established.
export function calculateMcmTireForce({axis,direction,load,coefficient5b0,coefficient5b4,scale=1,rear=false}) {
  const f=Math.fround;
  const dot=Math.abs(add(add(mul(axis[1],direction[1]),mul(axis[0],direction[0])),mul(axis[2],direction[2])));
  const alignment=f(dot),square=mul(dot,alignment);
  const perpendicular=f(Math.sqrt(sub(1,!(square>=1)?f(square):1)));
  const lateral=mul(mul(-coefficient5b0,perpendicular),load);
  const longitudinal=mul(mul(-coefficient5b4,alignment),load);
  const scalar=rear?mul(add(longitudinal,lateral),scale):add(longitudinal,mul(lateral,f(.1)));
  const stored=f(scalar),force=[f(mul(scalar,direction[0])),f(mul(stored,direction[1])),f(mul(stored,direction[2]))];
  const magnitude=floatBits(stored)>0x80000000?f(-stored):stored;
  return {alignment,perpendicular,magnitude,force};
}
