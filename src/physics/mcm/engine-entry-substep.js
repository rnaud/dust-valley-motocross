import {updateMcmSubstepStart} from './substep-start.js';
import {updateMcmPreparedSubstep} from './prepared-substep.js';

// Original 0x4a5bd7..0x4a5e27, retaining the same engine and bike fields
// used by the ensuing ordinary contact/force/collision substep.
export function prepareMcmEngineEntry(c){
 const s=c.engineEntry,e=s.engine;
 s.brake=c.brakeInput;
 const result=updateMcmSubstepStart(s);
 c.totalTorque=[0,0,0];c.traction.scratch[0]=1;c.frontLoad.turnAngle=0;c.contactCorrection.mask=0;
 c.frontTire.alignment=1;c.traction.tire.alignment=1;c.frontTire.perpendicular=0;c.traction.tire.perpendicular=0;
 c.mass=s.mass;c.traction.inverseMass=s.inverseMass;c.baseForce[1]=s.field694;
 c.brakeInput=s.brake;c.speed=s.previousSpeed;c.chassisImpulse.speed=s.speed;c.velocity=s.velocity;
 c.drive.released=e.released;c.drive.rpmDemand=e.rpmDemand;c.drive.gearRatio=e.ratios[e.gear];c.motionTransform.engineLevel=e.state;
 return result;
}
export function updateMcmEngineEntrySubstep(c){prepareMcmEngineEntry(c);return updateMcmPreparedSubstep(c);}
