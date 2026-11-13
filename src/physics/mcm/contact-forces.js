import {floatBits} from './math.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';
import {updateMcmContactSubstep} from './contact-substep.js';
const f=Math.fround;

// Original shared force preparation 0x4a64dc..0x4a663d. Both signed zeros
// count as contact; drag uses a rounded scalar before scaling velocity.
export function prepareMcmContactForces(c){
 c.frontContact=+(floatBits(c.heights[0])<=0x80000000);
 c.rearContact=+(floatBits(c.heights[1])<=0x80000000);
 c.bothContact=+(c.frontContact&&c.rearContact);c.anyContact=+(c.frontContact||c.rearContact);
 c.rearNormalY=c.points[5][1];c.speedCopy=c.speed;c.force=[...c.baseForce];
 if(c.speed>c.dragThreshold){
  const scalar=f(-(c.dragCoefficient*c.speed));c.offset=c.velocity.map(v=>f(v*scalar));
  c.force=c.force.map((v,i)=>f(v+c.offset[i]));
 }
 const a=c.bikeForward,b=c.rearTangent;
 c.rearAlignment=Math.abs(f((a[1]*b[1]+a[0]*b[0])+a[2]*b[2]));
 const delta=c.points[6].map((v,i)=>f(v-c.points[7][i])),[x,y,z]=delta;
 const inverse=mcmInverseSqrt(f((y*y+z*z)+x*x));c.contactDirection=delta.map(v=>f(v*inverse));
}

export function updateMcmContactForceSubstep(c){
 const result=updateMcmContactSubstep(c);prepareMcmContactForces(c);return result;
}
