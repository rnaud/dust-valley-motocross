import {updateMcmPreparedResetSubstep} from './prepared-reset-substep.js';
import {prepareMcmContactForces} from './contact-forces.js';
import {prepareMcmContactRoll} from './contact-roll.js';
import {prepareMcmContactGeometry} from './contact-geometry.js';
import {queryMcmChassisProbes} from './chassis-probes.js';
import {updateMcmContactResponse} from './contact-response.js';

// Original 0x4a5e27..0x4a6eac. Read the reset-produced state before entering
// common force/contact preparation; the ordinary wheel query must not run again.
export function updateMcmResetContactResponse(c){
 const result=updateMcmPreparedResetSubstep(c);
 applyMcmBikeContactResponse(c);
 return result;
}

// Shared 0x4a64dc..0x4a6eac, consuming already-produced wheel contacts.
export function applyMcmBikeContactResponse(c){
 const b=c.bike,p=c.contactPhase;
 Object.assign(p,{points:c.points,heights:c.heights,terrain:c.terrain,
  bodyNode:c.bodyNode,rearMountNode:c.suspension.rear.node,
  speed:b.field564,baseForce:[b.field690,b.field694,b.field698],
  dragCoefficient:b.field69c,dragThreshold:b.field6a0,velocity:b.velocity,
  bikeForward:b.forward,rearTangent:b.rearTangent,tangent:b.tangent,
  offset:b.offset,normal:b.normal,state844:b.field844,roll:b.field4d8,pitch:b.field4dc,
  componentAngle:c.componentAngle,componentLimit:c.riderComponentLimit??p.componentLimit,control1c:c.control1c,control30:c.control30,control2c:c.control2c});
 for(const field of ['4bc','870','718','8c4','b4c','c6c','714','c78','c70','c74'])p[`field${field}`]=b[`field${field}`];
 p.field53c=b.angularVelocity[2];
 prepareMcmContactForces(p);prepareMcmContactRoll(p);prepareMcmContactGeometry(p);
 queryMcmChassisProbes(p);updateMcmContactResponse(p);
 b.field894=p.rearNormalY;b.field4f0=p.targetRoll;b.field4f4=p.targetRollCos;
 b.normal=p.normal;b.offset=p.offset;
 for(const field of ['4bc','870','718','8c4','b4c','c6c','714','c78','c70','c74'])b[`field${field}`]=p[`field${field}`];
 b.angularVelocity[2]=p.field53c;
 c.control1c=p.control1c;c.control30=p.control30;c.control2c=p.control2c;
 c.componentAngle=p.componentAngle;
}
