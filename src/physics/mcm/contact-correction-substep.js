import {updateMcmPairedContactForceSubstep} from './paired-contact-force-substep.js';
import {applyMcmContactCorrection} from './contact-correction.js';
import {invalidateMcmTransform} from './event-orientation.js';

// Original 0x4aaa55..0x4aaded. The crashed chassis-contact path exits earlier.
export function correctMcmSubstepContacts(c){
 if(c.state844&&c.chassisContact.enabled)return;
 const s=c.contactCorrection,a=c.chassisResponse,b=c.chassisImpulse;
 const r=applyMcmContactCorrection({
  matrix:c.bodyNode.local,pivot:c.frontLoad.localArm,torque:c.singleContactForce.torque,
  inertia:[a.normalCoefficients[0],b.normalY,a.normalCoefficients[1],a.crashCoefficients[0],b.crashY,a.crashCoefficients[1]],
  state:c.state844,contact:c.anyContact,both:c.bothContact,rear:c.rearContact,front:c.frontContact,
  field4d8:c.roll,field560:c.forwardSpeed,component44:c.componentAngle,
  controller170:s.controller170,controller140:s.controller140,field6ac:s.angle,mask:s.mask,
  field894:c.rearNormalY,field590:c.heights[0],field594:c.heights[1],field6a4:b.speed,
  field5d8:c.supportDepth,field4f4:c.targetRollCos,dt:c.dt,
 });
 s.angle=r.field6ac;s.mask=r.mask;s.acceleration=r.acceleration;
 if(r.rotationApplied){c.bodyNode.local=r.matrix;invalidateMcmTransform(c.bodyNode);}
}
export function updateMcmContactCorrectionSubstep(c){
 const r=updateMcmPairedContactForceSubstep(c);correctMcmSubstepContacts(c);return r;
}
