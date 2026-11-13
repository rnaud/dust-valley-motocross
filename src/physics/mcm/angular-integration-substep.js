import {updateMcmContactCorrectionSubstep} from './contact-correction-substep.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {applyMcmOpposingAcceleration} from './opposing-acceleration.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x4aaded..0x4aaf02: resolve the corrected body before opposing torque.
export function integrateMcmSubstepAngularVelocity(c){
 if(c.state844&&c.chassisContact.enabled)return;
 const s=c.angularIntegration,a=c.chassisResponse,b=c.chassisImpulse;
 const inertia=c.state844?[a.crashCoefficients[0],b.crashY,a.crashCoefficients[1]]:[a.normalCoefficients[0],b.normalY,a.normalCoefficients[1]];
 s.local=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.totalTorque);
 s.opposing=s.local.map((v,i)=>f(mul(mul(inertia[i],v),c.state844?1:[f(.1),1,.5][i])));
 const r=applyMcmOpposingAcceleration({velocity:[...a.angularXY,c.field53c],acceleration:c.contactCorrection.acceleration,opposing:s.opposing,dt:c.dt});
 c.contactCorrection.acceleration=r.acceleration;
 const velocity=r.velocity.map((v,i)=>f(add(mul(r.acceleration[i],c.dt),v)));
 a.angularXY=velocity.slice(0,2);c.field53c=velocity[2];
}
export function updateMcmAngularIntegrationSubstep(c){
 const r=updateMcmContactCorrectionSubstep(c);integrateMcmSubstepAngularVelocity(c);return r;
}
