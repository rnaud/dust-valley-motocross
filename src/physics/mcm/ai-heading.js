import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround,tau=f(2*Math.PI),half=f(Math.PI/2),less=(a,b)=>a<b||Number.isNaN(a)||Number.isNaN(b);
const wrap=x=>{let y=f(x);if(x>Math.PI)y=f(sub(y,tau));if(!(y>-Math.PI))y=f(add(y,tau));return y;};
// Original 46dec6..46df48. Overrides the route target before either branch.
export function computeMcmAiHeadingOverride({enabled,threshold,lateralError,segmentHeading,targetHeading,heading}){
 if(!enabled)return targetHeading;
 return (floatBits(threshold)|0)>0&&less(Math.abs(lateralError),threshold)?wrap(add(segmentHeading,half)):heading;
}
// Original 46e9f0..46eb14, selected when bike +4bc is nonzero.
export function computeMcmAiAirborneSteering({class27,targetHeading,heading,velocityHeading,vx,vz,matrix4c0,matrix4c8}){
 const targetDifference=wrap(sub(targetHeading,heading));
 return class27&&(!less(add(mul(matrix4c8,vx),mul(vz,matrix4c0)),2)||less(targetDifference,Math.PI/8))?targetDifference:wrap(sub(velocityHeading,heading));
}
