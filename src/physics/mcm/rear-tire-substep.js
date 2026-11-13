import {floatBits} from './math.js';
import {mcmInverseSqrtLookup as mcmInverseSqrt} from './inverse-sqrt.js';
import {calculateMcmTireForce} from './tire-force.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {updateMcmRearMotionSubstep} from './rear-motion-substep.js';
const f=Math.fround;

// Original 0x4a8216..0x4a8634: rear traction scaling, shared arm and tire force.
export function updateMcmRearTire(c){
 if(!c.anyContact)return;
 const t=c.traction,s=t.scratch;
 if(!c.rearContact){
  c.rearSuspension.active=0;c.rearSuspension.previousTravel=0;c.rearSuspension.compression=0;
  c.rearMotion.speed=0;c.rearSuspension.contactLimited=+(c.state844===2);return;
 }
 if(t.maxSpeed>c.rearMotion.forwardMagnitude && !c.state844){
  const [x,y,z]=t.acceleration,squared=(x*x+y*y)+z*z;s[3]=f(squared);
  s[2]=f(t.inverseMass*c.driveScalar-((squared===0||Number.isNaN(squared))?0:1/mcmInverseSqrt(s[3])));
  s[4]=f(c.frontWeight+.5);s[5]=(floatBits(c.bikeForward[1])|0)>0?t.rollCos:1;
  if((floatBits(s[2])|0)<0x3f8147ae)s[6]=1;
  else{s[7]=(floatBits(s[2])|0)<0x43a00000?s[2]:320;s[6]=f((400-s[7])*f(.0025));}
  s[8]=t.maxSpeed<c.rearMotion.forwardMagnitude?1:f(1-(t.maxSpeed-c.rearMotion.forwardMagnitude)/t.maxSpeed);
  const product=(s[5]*s[4])*s[6];s[9]=f(product);s[10]=product<1?s[9]:1;
  s[11]=s[8]<s[10]?s[10]:s[8];const factor=t.gain*s[11];s[0]=f(factor);
  const v=c.frontLoad.scratch354;c.frontLoad.scratch354=[f(factor*v[0]),f(s[0]*v[1]),f(s[0]*v[2])];
 }
 s[1]=f(1-s[0]);
 if(c.bothContact){
  if((floatBits(s[0])|0)<0x3f666666)c.offset=c.points[6].map((v,i)=>f(v-c.bodyPosition[i]));
  else c.offset=c.points[6].map((v,i)=>f((c.points[7][i]-v)*.5+v-c.bodyPosition[i]));
  c.frontLoad.localArm=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.offset);
 }
 if((floatBits(c.rearMotion.speed)|0)>0x3a83126f){
  Object.assign(t.tire,calculateMcmTireForce({axis:c.rearTangent,direction:c.rearMotion.direction,
   load:c.rearMotion.normalLoad,coefficient5b0:c.frontTire.coefficient5b0,coefficient5b4:c.frontTire.coefficient5b4,scale:s[0],rear:true}));
 }else{t.tire.force=[0,0,0];t.tire.magnitude=0;}
}
export function updateMcmRearTireSubstep(c){
 const result=updateMcmRearMotionSubstep(c);updateMcmRearTire(c);return result;
}
