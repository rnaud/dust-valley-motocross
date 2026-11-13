import {floatBits} from './math.js';
const f=Math.fround;
const signedAngle=(cosine,sign)=>{
 const angle=f(Math.acos(cosine));
 return floatBits(sign)>0x80000000?f(-angle):angle;
};
// Original 0x43f870: angles and cached trigonometric terms from forward/up.
// Uses hardware square root (not the coarse physics lookup) and float32 stores.
export function extractMcmOrientationAngles(forward,up){
 const [x,y,z]=forward,[ux,uy,uz]=up;
 const horizontal=f(Math.sqrt(z*z+x*x));
 const c=horizontal===0?1:f(z/horizontal),s=horizontal===0?0:f(x/horizontal);
 let yaw=signedAngle(c,x);
 const projection=f(s*x+c*z),side=f(c*ux-s*uz),along=f(s*ux+c*uz);
 const length=f(Math.sqrt(projection*projection+y*y));
 const cosPitch=length===0?1:f(projection/length),sinPitch=length===0?0:f(y/length);
 const pitch=signedAngle(cosPitch,y);
 const vertical=f(cosPitch*uy-sinPitch*along);
 const rollLength=f(Math.sqrt(side*side+vertical*vertical));
 const cosRoll=rollLength===0?1:f(vertical/rollLength),sinRoll=rollLength===0?0:f(side/rollLength);
 let roll=signedAngle(cosRoll,side);
 if(Math.abs(pitch-f(Math.PI/2))<f(.1745)){
  const raw=yaw-roll;yaw=f(raw);if(raw<0)yaw=f(yaw+f(2*Math.PI));roll=0;
 }else if(Math.abs(pitch+f(Math.PI/2))<f(.1745)){
  const raw=roll+yaw;yaw=f(raw);if(raw>2*Math.PI)yaw=f(yaw-f(2*Math.PI));roll=0;
 }
 return {yaw,pitch,roll,sinRoll,cosRoll,cosPitch};
}
