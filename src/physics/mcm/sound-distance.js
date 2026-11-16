import {mcmSqrtLookup,floatBits,bitsFloat} from './math.js';
import {mcmMultiply as mul,mcmAdd as add,mcmSubtract as sub} from './x87-arithmetic.js';
// Original 4276f0/427760. Vertical separation is intentionally ignored.
export function mcmSoundDistance(a,b){
 const x=Math.fround(Math.abs(sub(a[0],b[0]))),z=Math.fround(Math.abs(sub(a[2],b[2])));
 if((floatBits(x)|0)>0x43960000||(floatBits(z)|0)>0x43960000)return 300;
 return mcmSqrtLookup(Math.fround(add(mul(z,z),mul(x,x))));
}
export function mcmSoundAttenuation(a,b,pan=0){
 const distance=mcmSoundDistance(a,b);
 if(distance>300)return {distance,volume:-2500,pan};
 const scaled=mul(mul(Math.fround(distance),bitsFloat(0x3b5a740e)),-2500),volume=Number.isFinite(scaled)?Math.trunc(scaled):-2147483648;
 return {distance,volume:volume|0,pan:0};
}
