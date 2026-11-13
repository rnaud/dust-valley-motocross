import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround;
const signedAngle=(cosine,sign)=>{
 // The original CRT acos preserves the incoming quiet NaN.
 const angle=Number.isNaN(cosine)?cosine:f(Math.acos(cosine));
 return floatBits(sign)>0x80000000?f(-angle):angle;
};
const zeroOrUnordered=x=>x===0||Number.isNaN(x);
// Original 0x43f870: angles and cached trigonometric terms from forward/up.
// C3 tests use the raw square root, before its float32 store, and also select
// the fallback on unordered results. The final gimbal guards use x87 C0.
export function extractMcmOrientationAngles(forward,up){
 const [x,y,z]=forward,[ux,uy,uz]=up;
 const rawHorizontal=Math.sqrt(add(mul(z,z),mul(x,x))),horizontal=f(rawHorizontal);
 const horizontalZero=zeroOrUnordered(rawHorizontal);
 const c=horizontalZero?1:f(div(z,horizontal)),s=horizontalZero?0:f(div(x,horizontal));
 let yaw=signedAngle(c,x);
 const projection=f(add(mul(s,x),mul(c,z))),side=f(sub(mul(c,ux),mul(s,uz))),along=f(add(mul(s,ux),mul(c,uz)));
 const rawLength=Math.sqrt(add(mul(projection,projection),mul(y,y))),length=f(rawLength),lengthZero=zeroOrUnordered(rawLength);
 const cosPitch=lengthZero?1:f(div(projection,length)),sinPitch=lengthZero?0:f(div(y,length));
 const pitch=signedAngle(cosPitch,y);
 const vertical=f(sub(mul(cosPitch,uy),mul(sinPitch,along)));
 const rawRollLength=Math.sqrt(add(mul(side,side),mul(vertical,vertical))),rollLength=f(rawRollLength),rollZero=zeroOrUnordered(rawRollLength);
 const cosRoll=rollZero?1:f(div(vertical,rollLength)),sinRoll=rollZero?0:f(div(side,rollLength));
 let roll=signedAngle(cosRoll,side);
 if(!(Math.abs(sub(pitch,f(Math.PI/2)))>=f(.1745))){
  const raw=sub(yaw,roll);yaw=f(raw);if(!(raw>=0))yaw=f(add(yaw,f(2*Math.PI)));roll=0;
 }else if(!(Math.abs(add(pitch,f(Math.PI/2)))>=f(.1745))){
  const raw=add(roll,yaw);yaw=f(raw);if(raw>2*Math.PI)yaw=f(sub(yaw,f(2*Math.PI)));roll=0;
 }
 return {yaw,pitch,roll,sinRoll,cosRoll,cosPitch};
}
