import {floatBits} from './math.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
const f=Math.fround;
// Original 0x47b107..0x47b1fe. The fallback is the initialized zero vector,
// distinct from the runtime vector-rotation helper's normalization fallback.
export function deriveMcmChaseSource({direction,velocity,bike6a4,bike620}){
 const fromVelocity=(floatBits(f(bike6a4))|0)>=0x40a00000;
 let vector=Float32Array.from(fromVelocity?velocity:direction);vector[1]=0;
 if(fromVelocity&&!bike620){vector[0]=-vector[0];vector[2]=-vector[2];}
 const sum=(vector[1]*vector[1]+vector[2]*vector[2])+vector[0]*vector[0];
 if(sum===0||Number.isNaN(sum))vector=new Float32Array(3);
 else{const inverse=mcmInverseSqrtLookup(f(sum));for(let i=0;i<3;i++)vector[i]=f(vector[i]*inverse);}
 return {source:vector,squaredLength:f(sum)};
}
// Original 0x47b452..0x47b4e5. Preserve different X vs Y/Z store points.
export function deriveMcmChaseBase({position,velocity,delta,usePrevious,previousTarget}){
 if(usePrevious)return {base:Float32Array.from(previousTarget),predictionDelta:null};
 const dt=(floatBits(f(delta))|0)>0x3e4ccccd?f(.2):f(delta),p=Float32Array.from(position),v=Float32Array.from(velocity);
 return {base:Float32Array.of(f(p[0]+v[0]*dt),f(p[1]+f(v[1]*dt)),f(p[2]+f(v[2]*dt))),predictionDelta:dt};
}
