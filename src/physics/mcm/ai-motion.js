import {setMcmLocalChildOrientation} from './local-child-transform.js';
import {mcmSinCos} from './x87-trig.js';
import {floatBits as bits} from './math.js';
const f=Math.fround;
// Original 0x4703c2..0x470553. The caller supplies the actual transform graph;
// orientation changes normalize the body axes and invalidate its cached nodes.
export function advanceMcmAiMotion(c,root){
 let velocity=[...c.velocity];const forward=Float64Array.from(c.forward),up=Float64Array.from(c.up);
 const rotated=!c.airborne&&(bits(c.speed)|0)>0&&(bits(c.turnScale)|0)>0;
 if(rotated){
  const {sin,cos}=mcmSinCos(c.turnScale*c.difference*c.dt);
  const rotate=a=>{const x=a[0],z=a[2];a[2]=f(z*cos-x*sin);a[0]=f(x*cos+z*sin);};
  rotate(velocity);rotate(forward);rotate(up);setMcmLocalChildOrientation(root,forward,up);
 }
 const boosted=(bits(c.pitchAngle)|0)<0x3f490fdb&&bits(c.throttle)===0x3f800000&&(bits(c.oldSpeed)|0)<0x41f00000;
 if(boosted)velocity=velocity.map((v,i)=>f(forward[i]*5+v));
 const speed=f(Math.sqrt((velocity[2]*velocity[2]+velocity[0]*velocity[0])+velocity[1]*velocity[1]));
 return {velocity,forward,up,speed,oldSpeed:c.oldSpeed,difference:c.difference,heading:c.heading,fieldb6c:(c.fieldb6c&0xffffff00)>>>0,rotated,boosted};
}
