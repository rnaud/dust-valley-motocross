import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {accumulateMcmPairedForceTorque} from './paired-force-torque.js';
import {calculateMcmContactTorque} from './contact-torque.js';
import {updateMcmSingleContactForceSubstep} from './single-contact-force-substep.js';
const f=Math.fround;
// Original 0x4ad430 with the initialized world-up vector. The dot remains
// binary64 until the projected vector stores (unlike the single-wheel caller).
function projectUp(v){
 const dot=add(add(mul(v[1],1),mul(0,v[0])),mul(v[2],0));
 return [0,1,0].map(n=>f(mul(n,dot)));
}

// Original 0x4aa573..0x4aaa55, including both sequential pitch clips.
export function assembleMcmPairedContactForces(c){
 if((c.state844&&c.chassisContact.enabled)||!c.bothContact)return;
 const s=c.pairedContactForce,t=c.singleContactForce;
 s.rearNormal=c.points[5].map(v=>f(mul(v,c.rearMotion.normalLoad)));
 s.frontNormal=c.points[4].map(v=>f(mul(c.frontMotion.normalLoad,v)));
 s.rearProjection=projectUp(c.suspensionForces.rear.force);
 c.rearLoad.force=c.rearLoad.force.map((v,i)=>f(add(mul(c.targetRollCos,s.rearProjection[i]),v)));
 s.frontProjection=projectUp(c.suspensionForces.front.force);
 c.frontLoad.force=c.frontLoad.force.map((v,i)=>f(add(mul(c.targetRollCos,s.frontProjection[i]),v)));
 c.frontLoad.force=c.frontLoad.force.map((v,i)=>f(add(v,s.frontNormal[i])));
 c.rearLoad.force=c.rearLoad.force.map((v,i)=>f(add(v,s.rearNormal[i])));
 const matrix=resolveMcmWorldMatrix(c.bodyNode);
 const r=accumulateMcmPairedForceTorque({matrix,totalForce:c.force,force2ac:c.frontLoad.force,force2b8:c.rearLoad.force,arm3c0:c.rearLoad.arm,arm3fc:c.frontLoad.arm,counter:t.counter,control:c.riderLean});
 c.force=r.totalForce;t.torque=r.totalTorque;t.counter=r.counter;c.normal=r.scratch54c;
 c.force=c.force.map((v,i)=>f(add(c.frontLoad.scratch354[i],v)));
 const drive=calculateMcmContactTorque({a:c.rearLoad.arm,b:c.frontLoad.scratch354,field4dc:c.pitch,angularVelocityX:c.chassisResponse.angularXY[0],ai:c.drive.ai,flag:c.frontContact,field6ec:c.riderLean,component44:c.componentAngle});
 t.driveTorque=drive.torque;c.chassisResponse.angularXY[0]=drive.angularVelocityX;
 c.offset=inverseRotateMcmVector(matrix,t.driveTorque);
 t.torque=t.torque.map((v,i)=>f(add(c.offset[i],v)));
 c.chassisResponse.localLever=[...c.frontLoad.localArm];
}
export function updateMcmPairedContactForceSubstep(c){
 const result=updateMcmSingleContactForceSubstep(c);assembleMcmPairedContactForces(c);return result;
}
