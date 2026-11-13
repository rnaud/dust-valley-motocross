import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {floatBits} from './math.js';

// Original 0x4ab688–0x4ab7cc/0x4ab7fd: build the rotation passed to 0x4b8070.
// previousAxis is bike+0x540; a skipped rotation leaves those bytes unchanged.
export function prepareMcmRotation({angularVelocity, previousAxis, dt}) {
  const [x,y,z] = angularVelocity;
  const square = (z*z + x*x) + y*y;
  const angle = square === 0 || Number.isNaN(square) ? 0 : Math.fround(dt / mcmInverseSqrtLookup(Math.fround(square)));
  if (!Number.isFinite(angle) || (floatBits(angle)|0) < 0x38d1b717) {
    return {angle, axis:[...previousAxis], apply:false};
  }
  const normalizationSquare = (x*x + y*y) + z*z;
  if(normalizationSquare===0||Number.isNaN(normalizationSquare))return {angle,axis:[0,0,0],apply:true};
  const inverse = mcmInverseSqrtLookup(Math.fround(normalizationSquare));
  return {angle, axis:angularVelocity.map(v=>Math.fround(v*inverse)), apply:true};
}
