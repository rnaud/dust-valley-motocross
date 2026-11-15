import {floatBits as bits} from './math.js';
const f=Math.fround;
// Original 46f4ea..46f69e, including signed-bit timestep gates and clamps.
const finalClamp=x=>(bits(x)|0)>0x3f800000?1:bits(x)>0xbf800000?-1:x;
export function computeMcmAiSteeringControl({dt,difference:diff,current}){
 const absolute=f(Math.abs(diff));if((bits(dt)|0)<=0)return {steering:current,absoluteDifference:absolute};let out;
 if(Math.abs(diff)>0){const raw=diff*-2;let target=f(raw);if(raw>1)target=1;else if(bits(target)>0xbf800000)target=-1;const delta=target-current,storedDelta=f(delta),rawRate=Math.abs(delta)*32;let rate=f(rawRate);if(rawRate>32)rate=32;else if(bits(rate)>0xc2000000)rate=-32;out=rate*dt>1?target:f(rate*storedDelta*dt+current);}
 else{const rawRate=Math.abs(current)*32;let rate=f(rawRate);if(rawRate>32)rate=32;else if(bits(rate)>0xc2000000)rate=-32;out=rate*dt>1?0:f(-current*rate*dt+current);}
 return {steering:finalClamp(out),absoluteDifference:absolute};
}
