import {evaluateResetChassisImpulse} from './reset-chassis-impulse-case.mjs';
import {updateMcmResetLinearIntegration} from '../../src/physics/mcm/reset-linear-integration.js';
import {floatBits} from '../../src/physics/mcm/math.js';

function groups(p){
 const s=p.suspensionForces,t=p.singleContactForce,q=p.pairedContactForce;
 return [[s.extraStiffness],s.front.force,s.front.dampingForce,s.rear.force,s.rear.dampingForce,
  t.torque,t.frontNormal,t.rearNormal,t.frontProjection,t.rearProjection,t.partials,t.rearScale,t.driveTorque,
  q.rearNormal,q.frontNormal,q.rearProjection,q.frontProjection,[p.contactCorrection.mask],p.contactCorrection.acceleration,
  p.angularIntegration.local,p.angularIntegration.opposing,p.linearIntegration.deltaVelocity,[p.linearIntegration.rotation]];
}
export function resetIntegrationScratch(p){return groups(p).flatMap(v=>Array.from(v));}
export function resetIntegrationWords(p){
 const scratch=groups(p).flatMap(v=>Array.from(v,floatBits));scratch[49]=p.contactCorrection.mask>>>0;return scratch;
}
export function evaluateResetLinearIntegration(input,step=updateMcmResetLinearIntegration){
 let p;
 const words=evaluateResetChassisImpulse(input,c=>{const result=step(c);p=c.contactPhase;return result;});
 words[0x8bc/4]=p.singleContactForce.counter>>>0;words[0x6e0/4]=p.linearIntegration.counter>>>0;
 return [...words,...resetIntegrationWords(p)];
}
