import {mcmSqrtLookup,floatBits} from './math.js';
import {mcmInverseSqrtSeed} from './inverse-sqrt.js';
import {mcmSubtract as sub,mcmMultiply as mul,mcmAdd as add,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround,equal=(a,b)=>a===b||Number.isNaN(a)||Number.isNaN(b);
const squareDistance=(a,x,z)=>{const dx=sub(a.x,x),dz=sub(a.z,z);return add(mul(dz,dz),mul(dx,dx));};
// Original 0x46dac1..0x46dec6, all modes. Current target and nearest segment
// are distinct inputs: the retained target may already have advanced.
export function computeMcmAiRouteGuidance({mode=0,target,targetNext,nearest,previous,next,x,z,heading,lookahead,inverseLength,direction}){
 mode&=65535;
 if(mode===1&&!direction)throw Error('Missing AI mode-1 direction');
 const distance=mcmSqrtLookup(f(squareDistance(target,x,z)));let aimX,aimZ;
 if(mode===1){
  const dot=add(mul(sub(target.x,x),direction.x),mul(sub(target.z,z),direction.z)),positive=dot>0;
  const near=(floatBits(distance)|0)<0x42c80000,scale=near?(positive?f(-.48):f(.48)):(positive?-48:48);
  aimX=f(add(mul(near?mul(direction.x,distance):direction.x,scale),target.x));
  aimZ=f(add(mul(near?mul(direction.z,distance):direction.z,scale),target.z));
 }else if(lookahead===0||lookahead<distance||Number.isNaN(lookahead)||Number.isNaN(distance)||target.kind===8){
  aimX=f(add(target.offsetX,target.x));aimZ=f(add(target.offsetZ,target.z));
 }else{
  const inverse=div(1,lookahead),remaining=sub(lookahead,distance);
  aimX=f(mul(add(mul(add(target.offsetX,target.x),distance),mul(add(targetNext.offsetX,targetNext.x),remaining)),inverse));
  aimZ=f(mul(add(mul(add(target.offsetZ,target.z),distance),mul(add(targetNext.z,targetNext.offsetZ),remaining)),inverse));
 }
 const targetHeading=equal(x,aimX)&&equal(z,aimZ)?heading:f(Math.atan2(sub(aimX,x),sub(aimZ,z)));
 let speedLimit=mode===0?160:mode===1?160:target.speedLimit;
 if(mode===1&&(floatBits(distance)|0)<=0x42c80000){
  const raw=sub(targetHeading,heading);let delta=f(raw);if(raw>Math.PI)delta=f(sub(delta,f(2*Math.PI)));if(delta<=-Math.PI||Number.isNaN(delta))delta=f(add(delta,f(2*Math.PI)));
  // Original reuses the aim-X scratch slot for this angle difference.
  aimX=delta;if(Math.abs(delta)>=f(.1))speedLimit=80;
 }
 let lateralError=0;
 if(squareDistance(next,x,z)<squareDistance(previous,x,z)){
  if(!equal(nearest.x,next.x)||!equal(nearest.z,next.z))lateralError=f(mul(sub(mul(sub(next.z,nearest.z),sub(x,nearest.x)),mul(sub(z,nearest.z),sub(next.x,nearest.x))),inverseLength));
 }else if(!equal(nearest.x,previous.x)||!equal(nearest.z,previous.z)){
  const inverse=mcmInverseSqrtSeed(f(squareDistance(previous,nearest.x,nearest.z)));
  lateralError=f(mul(sub(mul(sub(nearest.z,previous.z),sub(x,nearest.x)),mul(sub(z,nearest.z),sub(nearest.x,previous.x))),inverse));
 }
 return {distance,aimX,aimZ,targetHeading,speedLimit,lateralError};
}
