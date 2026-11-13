import {bitsFloat,floatBits} from './math.js';

// Exceptional arithmetic for the observed canonical NaNs in recovered state.
// x87 invalid operations produce negative indefinite; equal NaN payloads with
// opposite signs select the positive operand. Arbitrary payloads are excluded.
function calculate(a,b,operation){
 if(Number.isNaN(a)||Number.isNaN(b)){
  const positive=(Number.isNaN(a)&&!(floatBits(a)>>>31))||(Number.isNaN(b)&&!(floatBits(b)>>>31));
  return bitsFloat(positive?0x7fc00000:0xffc00000);
 }
 const result=operation(a,b);return Number.isNaN(result)?bitsFloat(0xffc00000):result;
}
export const mcmAdd=(a,b)=>calculate(a,b,(x,y)=>x+y);
export const mcmSubtract=(a,b)=>calculate(a,b,(x,y)=>x-y);
export const mcmMultiply=(a,b)=>calculate(a,b,(x,y)=>x*y);
export const mcmDivide=(a,b)=>calculate(a,b,(x,y)=>x/y);
