import {floatBits} from './math.js';
import {mcmAdd, mcmDivide, mcmMultiply} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x423b63..0x423bc9: clock portion of the HUD/world update.
// This schedules refresh; it does not model the graphics call or its stack writes.
export function tickMcmHudRefreshClock(clock,{dt,enabled,refresh}){
 clock.elapsed=f(mcmAdd(clock.elapsed,dt));
 clock.frames=(clock.frames+1)>>>0;
 // The original compares the stored float's bits as a signed integer.
 if((floatBits(clock.elapsed)|0)<0x3f000000)return false;
 if(enabled)refresh?.();
 clock.frameMilliseconds=f(mcmMultiply(mcmDivide(clock.elapsed,clock.frames|0),1000));
 clock.elapsed=0;clock.frames=0;
 return !!enabled;
}
