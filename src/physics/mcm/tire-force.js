import {floatBits} from './math.js';

// Original front 0x4b1870 and rear 0x4b1960. Coefficient names retain bike
// offsets until their configuration fields are fully established.
export function calculateMcmTireForce({axis,direction,load,coefficient5b0,coefficient5b4,scale=1,rear=false}) {
  const f=Math.fround;
  const dot=Math.abs((axis[1]*direction[1]+axis[0]*direction[0])+axis[2]*direction[2]);
  const alignment=f(dot),square=dot*alignment;
  const perpendicular=f(Math.sqrt(1-(square<1?f(square):1)));
  const lateral=(-coefficient5b0*perpendicular)*load;
  const longitudinal=(-coefficient5b4*alignment)*load;
  const scalar=rear?(longitudinal+lateral)*scale:longitudinal+lateral*f(.1);
  const stored=f(scalar),force=[f(scalar*direction[0]),f(stored*direction[1]),f(stored*direction[2])];
  const magnitude=floatBits(stored)>0x80000000?f(-stored):stored;
  return {alignment,perpendicular,magnitude,force};
}
