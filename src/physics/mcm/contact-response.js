import {floatBits,bitsFloat} from './math.js';
import {updateMcmComponentAngle} from './contact-substep.js';
import {updateMcmChassisProbesSubstep} from './chassis-probes.js';
const f=Math.fround,sign=v=>floatBits(v)>0x80000000?-1:1;
const dot=(a,b)=>(a[1]*b[1]+a[0]*b[0])+a[2]*b[2];

// Original 0x4a6c01..0x4a6eac: crash steering and airborne/landing flags.
export function updateMcmContactResponse(c){
 if(c.state844){
  c.field870=0;c.field718=0;
  if(c.field4bc && (c.anyContact || c.control1c || c.control30)){c.field8c4=1;c.fieldb4c=0;}
  if(c.control1c)return;
  if(c.frontContact){
   if(c.rearContact){
    const step=bitsFloat(0x3cc49ba6);
    if((floatBits(c.targetRoll)|0)<0x3f000000){
     c.componentRate=Math.abs(c.targetRoll)<Math.abs(c.componentAngle) && sign(c.componentAngle)===sign(c.targetRoll)?step:-step;
    }else c.componentRate=sign(c.componentAngle)<0?step:-step;
   }else{
    c.responseScratch[0]=f(1-Math.abs((c.rearTangent[0]*c.bikeForward[0]+c.bikeForward[1]*c.rearTangent[1])+c.bikeForward[2]*c.rearTangent[2]));
    c.responseScratch[1]=f(((dot(c.velocity,c.points[4])*f(.025))*c.responseScratch[0])*c.dt);
    c.responseScratch[2]=sign(c.targetRoll);
    c.componentRate=f(-((c.dt*c.dt*f(32.2)+c.responseScratch[1])*c.responseScratch[2]));
   }
  }
  if(Math.abs(c.componentAngle)<c.componentLimit*1.25)updateMcmComponentAngle(c,c.componentRate);
 }else if(c.field4bc){
  if(c.anyContact && !c.field870){
   c.field870=1;c.field8c4=1;c.fieldb4c=0;c.fieldc6c=0;
   if(c.field714)c.field718=f(.3);
  }
 }else if(!c.anyContact){
  c.fieldc78=1;c.responseScratch[3]=sign(c.roll);
  c.fieldc70=c.responseScratch[3];c.fieldc74=c.field53c;
 }
}
export function updateMcmContactResponseSubstep(c){
 const result=updateMcmChassisProbesSubstep(c);updateMcmContactResponse(c);return result;
}
