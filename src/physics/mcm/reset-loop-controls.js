import {handoffMcmSubstepController} from './controller-handoff-substep.js';
import {updateMcmSubstepNormalControl} from './normal-control-substep.js';
import {applyMcmSubstepNormalRotation} from './normal-rotation-substep.js';
import {alignMcmSubstepGroundContact} from './normal-alignment-substep.js';

// Continue live second-pass state to the control/alignment exits before events.
export function continueMcmResetLoopControls(c){
 const b=c.bike,p=c.contactPhase,r=c.rider;
 Object.assign(p.controllerHandoff,{velocity:r.velocity,angularVelocity:r.angularVelocity,
  flag13c:r.flag13c,kind:b.field8b4,other:b.field8b0,otherVelocity:[0,0,0],axis:b.axis624});
 p.contactCorrection.controller140=r.field140;
 p.nodes=[c.bodyNode];
 p.normalControl={vector:[0,0,0],yaw:b.field6f4,flag820:b.field820,field730:b.field730,
  flags:b.fieldc68,flag6fc:b.field6fc,forwardIndex:0};
 p.normalRotation={angle:0};
 Object.assign(p.normalAlignment,{angle:b.field6a8,limit:b.field83c,rate:b.field840});
 p.field6b0=b.field6b0;
 handoffMcmSubstepController(p);updateMcmSubstepNormalControl(p);
 applyMcmSubstepNormalRotation(p);alignMcmSubstepGroundContact(p);
 r.velocity=p.controllerHandoff.velocity;r.angularVelocity=p.controllerHandoff.angularVelocity;
 b.velocity=p.velocity;b.angularVelocity=[...p.chassisResponse.angularXY,p.field53c];
 b.normal=p.normal;b.offset=p.offset;b.field6a4=p.chassisImpulse.speed;
 b.field6b0=p.field6b0;b.field6a8=p.normalAlignment.angle;b.field6ac=p.contactCorrection.angle;
 for(const field of ['c6c','c70','c74','c78'])b[`field${field}`]=p[`field${field}`];
 b.axis624=p.controllerHandoff.axis;
 for(let i=0;i<3;i++)b[`field${(0x624+i*4).toString(16)}`]=p.controllerHandoff.axis[i];
 return p.state844?4:p.frontSuspension.contactLimited||p.rearSuspension.contactLimited?3:p.field4bc?1:2;
}
