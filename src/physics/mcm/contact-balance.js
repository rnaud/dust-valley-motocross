import {resolveMcmWorldMatrix} from './world-transform.js';
import {floatBits} from './math.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {updateMcmContactResponseSubstep} from './contact-response.js';
const f=Math.fround;

// Original 0x4a6eac..0x4a7054. The filter result is stored as float32 but
// retained at x87 precision for the active front/rear weight calculation.
export function updateMcmContactBalance(c){
 if(!c.field4bc && !c.anyContact && !c.control2c){
  c.takeoffVelocity=[...c.velocity];c.takeoffPosition=[...c.bodyPosition];
 }
 c.field4bc=+(!c.anyContact && !c.control2c);
 if(c.field4bc)c.field870=0;
 const duration=c.balanceFilter[1],step=duration>c.dt?c.dt:duration;
 let value;
 if((floatBits(c.riderLean)&0x7fffffff)!==0 && !c.leanDisabled){
  c.balanceScratch[0]=f(c.riderLean*.25+.5);
  c.balanceScratch[1]=step;
  value=(step/duration)*(c.balanceScratch[0]-c.balanceFilter[0])+c.balanceFilter[0];
  c.rearWeight=f((value*c.riderMass+c.bikeMass*.5)/c.totalMass);
  c.frontWeight=f(1-c.rearWeight);
 }else{
  c.frontWeight=.5;c.rearWeight=.5;c.balanceScratch[2]=step;
  value=(.5-c.balanceFilter[0])*(step/duration)+c.balanceFilter[0];
 }
 c.balanceFilter[0]=f(value);c.balanceScratch[3]=f(value);
}
// Original 0x4a7054..0x4a7221: grounded weight offset or airborne node position.
export function updateMcmBalanceCenter(c){
 if(c.field4bc){c.balanceCenter=resolveMcmWorldMatrix(c.balanceNode).slice(12,15);return;}
 const [x,,z]=c.rearTangent,squared=z*z+x*x;
 c.balanceGeometryScratch[3]=f(squared);
 const inverse=squared===0?0:mcmInverseSqrt(f(squared));
 const direction=squared===0?[0,0,0]:[f(x*inverse),0,f(z*inverse)];
 c.balanceGeometryScratch.splice(0,3,...direction);
 const scale=(c.supportDepth+3)*(c.rearWeight-.5);
 const offset=direction.map(v=>f(v*scale));
 c.balanceGeometryScratch.splice(4,6,...offset,...offset);
 c.balanceCenter=c.balanceCenter.map((v,i)=>f(v+offset[i]));
 c.balanceGeometryScratch.splice(10,3,...c.balanceCenter);
}
export function updateMcmContactBalanceSubstep(c){
 const result=updateMcmContactResponseSubstep(c);updateMcmContactBalance(c);updateMcmBalanceCenter(c);return result;
}
