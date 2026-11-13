import {updateMcmResetMotionTransform} from './reset-motion-transform.js';
import {alignMcmSubstepGroundContact} from './normal-alignment-substep.js';

// Reset clears state844 and establishes a grounded contact. The native gates
// therefore select grounded alignment or the limited-contact bypass.
export function updateMcmResetAlignment(c){
 const result=updateMcmResetMotionTransform(c),b=c.bike,p=c.contactPhase;
 p.field6b0=b.field6b0;
 Object.assign(p.normalAlignment,{angle:b.field6a8,limit:b.field83c,rate:b.field840});
 p.controllerHandoff={axis:[b.field624,b.field628,b.field62c]};
 alignMcmSubstepGroundContact(p);
 b.field6b0=p.field6b0;b.field6a8=p.normalAlignment.angle;b.field6ac=p.contactCorrection.angle;
 b.angularVelocity=[...p.chassisResponse.angularXY,p.field53c];b.offset=p.offset;
 for(let i=0;i<3;i++)b[`field${(0x624+i*4).toString(16)}`]=p.controllerHandoff.axis[i];
 return result;
}
