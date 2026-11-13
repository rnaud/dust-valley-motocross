import {floatBits} from './math.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {applyMcmBikeCollisionImpulse} from './bike-collision-impulse.js';
import {updateMcmChassisResponseSubstep} from './chassis-response-substep.js';
const f=Math.fround;

// Original 0x4a9a52..0x4a9b29. Type 3 updates local angular velocity only;
// the stored world angular velocity remains unchanged at this boundary.
export function applyMcmChassisImpulse(c){
 if(!c.chassisContact.enabled)return;
 const s=c.chassisImpulse,r=c.chassisResponse,t=c.chassisContact;
 const bike={transform:c.bodyNode,state844:c.state844,inverseMass:c.traction.inverseMass,restitution:s.restitution,
  inverseInertia:[r.normalCoefficients[0],s.normalY,r.normalCoefficients[1]],
  alternateInertia:[r.crashCoefficients[0],s.crashY,r.crashCoefficients[1]],
  angularVelocity:[...r.angularXY,c.field53c],velocity:c.velocity};
 applyMcmBikeCollisionImpulse(bike,{normal:t.normal,contactVelocity:t.velocity,lever:t.arm,localLever:c.frontLoad.localArm,angularScale:t.coefficients,type:3,linearScale:0});
 c.velocity=bike.velocity;r.angularXY=bike.angularVelocity.slice(0,2);c.field53c=bike.angularVelocity[2];c.frontLoad.localArm=bike.field654;
 const [x,y,z]=c.velocity,squared=add(add(mul(z,z),mul(x,x)),mul(y,y));
 s.squaredSpeed=f(squared);s.speed=squared===0||Number.isNaN(squared)?0:f(Math.sqrt(s.squaredSpeed));
 if((floatBits(c.speed)|0)<0x3a83126f&&(floatBits(s.speed)|0)<0x3dcccccd){c.velocity=[0,0,0];r.angularXY[1]=0;s.speed=0;}
}
export function updateMcmChassisImpulseSubstep(c){
 const result=updateMcmChassisResponseSubstep(c);applyMcmChassisImpulse(c);return result;
}
