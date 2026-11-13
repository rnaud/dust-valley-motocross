import {updateMcmResetChassisImpulse} from './reset-chassis-impulse.js';
import {prepareMcmSuspensionForces} from './suspension-force-substep.js';
import {assembleMcmSingleContactForces} from './single-contact-force-substep.js';
import {assembleMcmPairedContactForces} from './paired-contact-force-substep.js';
import {correctMcmSubstepContacts} from './contact-correction-substep.js';
import {integrateMcmSubstepAngularVelocity} from './angular-integration-substep.js';
import {integrateMcmSubstepLinearVelocity} from './linear-integration-substep.js';

// Continuous reset path through 0x4ab49e: force assembly, contact correction,
// local angular integration and world-space linear motion.
export function updateMcmResetLinearIntegration(c){
 const result=updateMcmResetChassisImpulse(c),b=c.bike,p=c.contactPhase;
 const fields=['linearStiffness','cubicStiffness','dampingMultiplier','velocityLimit'];
 for(let side=0;side<2;side++)for(let i=0;i<4;i++)p.suspensionForces[side?'rear':'front'][fields[i]]=b[`field${(0x5b8+side*16+i*4).toString(16)}`];
 p.singleContactForce.counter=b.field8bc;
 p.contactCorrection.angle=b.field6ac;
 Object.assign(p.linearIntegration,{frozen:b.field61c,field5dc:b.field5dc,field8cc:b.field8cc,angle:b.field6d8,decay:b.field6dc,counter:b.field6e0});
 prepareMcmSuspensionForces(p);assembleMcmSingleContactForces(p);assembleMcmPairedContactForces(p);
 correctMcmSubstepContacts(p);integrateMcmSubstepAngularVelocity(p);integrateMcmSubstepLinearVelocity(p);
 b.position=p.bodyPosition;b.referencePosition=p.balanceCenter;b.velocity=p.velocity;b.acceleration=p.traction.acceleration;
 b.angularVelocity=[...p.chassisResponse.angularXY,p.field53c];b.localLever=p.frontLoad.localArm;b.normal=p.normal;b.offset=p.offset;
 b.field8bc=p.singleContactForce.counter;b.field6ac=p.contactCorrection.angle;b.field6a4=p.chassisImpulse.speed;
 b.field6d8=p.linearIntegration.angle;b.field6dc=p.linearIntegration.decay;b.field6e0=p.linearIntegration.counter;
 for(let i=0;i<3;i++)b[`field${(0x660+i*4).toString(16)}`]=p.chassisResponse.localLever[i];
 return result;
}
