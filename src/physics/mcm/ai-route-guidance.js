import {mcmSqrtLookup} from './math.js';
import {mcmInverseSqrtSeed} from './inverse-sqrt.js';
import {mcmSubtract as sub,mcmMultiply as mul,mcmAdd as add,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround,equal=(a,b)=>a===b||Number.isNaN(a)||Number.isNaN(b);
const squareDistance=(a,x,z)=>{const dx=sub(a.x,x),dz=sub(a.z,z);return add(mul(dz,dz),mul(dx,dx));};
// Original 0x46dac1..0x46dec6, mode 0. Current target and nearest segment
// are distinct inputs: the retained target may already have advanced.
export function computeMcmAiRouteGuidance({mode=0,target,targetNext,nearest,previous,next,x,z,heading,lookahead,inverseLength}){
 if(mode!==0)throw Error('Unsupported AI guidance mode');
 const distance=mcmSqrtLookup(f(squareDistance(target,x,z)));let aimX,aimZ;
 if(lookahead===0||lookahead<distance||Number.isNaN(lookahead)||Number.isNaN(distance)||target.kind===8){
  aimX=f(add(target.offsetX,target.x));aimZ=f(add(target.offsetZ,target.z));
 }else{
  const inverse=div(1,lookahead),remaining=sub(lookahead,distance);
  aimX=f(mul(add(mul(add(target.offsetX,target.x),distance),mul(add(targetNext.offsetX,targetNext.x),remaining)),inverse));
  aimZ=f(mul(add(mul(add(target.offsetZ,target.z),distance),mul(add(targetNext.z,targetNext.offsetZ),remaining)),inverse));
 }
 const targetHeading=equal(x,aimX)&&equal(z,aimZ)?heading:f(Math.atan2(sub(aimX,x),sub(aimZ,z)));
 let lateralError=0;
 if(squareDistance(next,x,z)<squareDistance(previous,x,z)){
  if(!equal(nearest.x,next.x)||!equal(nearest.z,next.z))lateralError=f(mul(sub(mul(sub(next.z,nearest.z),sub(x,nearest.x)),mul(sub(z,nearest.z),sub(next.x,nearest.x))),inverseLength));
 }else if(!equal(nearest.x,previous.x)||!equal(nearest.z,previous.z)){
  const inverse=mcmInverseSqrtSeed(f(squareDistance(previous,nearest.x,nearest.z)));
  lateralError=f(mul(sub(mul(sub(nearest.z,previous.z),sub(x,nearest.x)),mul(sub(z,nearest.z),sub(nearest.x,previous.x))),inverse));
 }
 return {distance,aimX,aimZ,targetHeading,speedLimit:160,lateralError};
}
