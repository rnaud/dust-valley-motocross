import {updateMcmResetTireForces} from './reset-tire-forces.js';
import {prepareMcmChassisContacts} from './chassis-contact-substep.js';
import {respondMcmChassisContacts} from './chassis-response-substep.js';
import {applyMcmChassisImpulse} from './chassis-impulse-substep.js';

// Continuous reset path through 0x4a9b29, including real chassis response.
export function updateMcmResetChassisImpulse(c){
 const result=updateMcmResetTireForces(c);
 applyMcmBikeChassisImpulse(c);return result;
}

export function applyMcmBikeChassisImpulse(c){
 const b=c.bike,p=c.contactPhase,r=p.chassisResponse,s=p.chassisImpulse;
 Object.assign(r,{normalCoefficients:[b.field5f0,b.field5f8],crashCoefficients:[b.field5fc,b.field604],
  angularXY:b.angularVelocity.slice(0,2),localLever:[b.field660,b.field664,b.field668]});
 Object.assign(s,{restitution:b.field5e0,normalY:b.field5f4,crashY:b.field600,speed:b.field6a4});
 prepareMcmChassisContacts(p);respondMcmChassisContacts(p);applyMcmChassisImpulse(p);
 b.position=p.bodyPosition;b.referencePosition=p.balanceCenter;b.velocity=p.velocity;
 b.angularVelocity=[...r.angularXY,p.field53c];b.localLever=p.frontLoad.localArm;b.normal=p.normal;b.offset=p.offset;
 b.field844=p.state844;b.field6a4=s.speed;
 for(let i=0;i<3;i++)b[`field${(0x660+i*4).toString(16)}`]=r.localLever[i];

}
