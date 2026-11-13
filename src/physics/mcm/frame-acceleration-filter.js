import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';

// Original 0x4ac95a..0x4ac968, before optional visual-effect processing.
export function beginMcmPostLoop(c){c.bike.field8c0=0;}

// Original 0x4acfd8..0x4ad078. frameDelta denotes the stored interval at
// stack+0x64: incoming delta plus prior carry, or the nominal step on the
// scheduler's zero-delta/no-whole-step fallback. It is not the final substep dt.
export function updateMcmFrameAcceleration(c){
 const b=c.bike,{filter,frameDelta}=c.frameTail,f=Math.fround;
 b.offset=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),b.velocity);
 const acceleration=f(div(sub(b.offset[2],b.field854),frameDelta));
 // FCOM C0/C3 selects the filter duration when less, equal or unordered.
 const interval=!(filter.duration>frameDelta)?filter.duration:frameDelta;
 filter.value=f(add(filter.value,mul(sub(acceleration,filter.value),div(interval,filter.duration))));
 b.field850=filter.value;b.field854=b.offset[2];
 return {acceleration};
}
