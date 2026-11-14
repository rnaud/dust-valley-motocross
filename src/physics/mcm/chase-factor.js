import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {stepMcmActiveChase} from './chase-active-eye.js';
const f=Math.fround;
// Original 0x47c685..0x47c7d2. Return typed words to preserve invalid-result
// signs: longitudinal projection, target-distance factor, velocity correction.
export function deriveMcmChaseFactor(camera,input){
 const velocity=Float32Array.from(input.velocity),source=Float32Array.from(input.source);
 const dot=f(add(add(mul(velocity[0],source[0]),mul(velocity[1],source[1])),mul(velocity[2],source[2])));
 const term=angle=>{const value=sub(1,mul(Math.abs(f(angle)),f(.6366197466850281)));return value<0||Number.isNaN(value)?0:f(value);};
 let factor=f(mul(term(camera.yaw),term(camera.pitch)));
 let bonus=f(add(mul(f(camera.radius),f(.011099999770522118)),1));
 if(input.eyeGate)bonus=0;
 else bonus=f(mul(mul(div(mul(bonus,bonus),f(input.denominator5ec)),dot),mul(sub(1,mul(f(camera.radius),f(.0016666667070239782))),3)));
 const verticalBits=floatBits(velocity[1]);
 if(verticalBits>0xc0a00000)bonus=f(mul(add(div(velocity[1],f(input.denominator6a4)),1),bonus));
 else if((verticalBits|0)>0x40a00000)bonus=f(mul(sub(1,div(velocity[1],f(input.denominator6a4))),bonus));
 factor=f(mul(add(factor,bonus),f(input.multiplier)));
 return Float32Array.of(dot,factor,bonus);
}
export function stepMcmFactorChase(state,input,delta){
 const factorState=deriveMcmChaseFactor(state.camera,input);
 return {...stepMcmActiveChase(state,{...input,factor:factorState[1]},delta),factorState};
}
