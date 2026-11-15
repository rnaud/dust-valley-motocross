import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {accumulateMcmPairedForceTorque} from './paired-force-torque.js';
import {calculateMcmContactTorque} from './contact-torque.js';
import {updateMcmSingleContactForceSubstep} from './single-contact-force-substep.js';
const f=Math.fround;
// Ordinary Array.map can canonicalize the first NaN while V8 changes its
// element representation. These values feed signed-bit pitch-clipping tests.
const vector=(fn)=>{const result=new Float64Array(3);for(let i=0;i<3;i++)result[i]=fn(i);return result;};
// Original 0x4ad430 with the initialized world-up vector. The dot remains
// binary64 until the projected vector stores (unlike the single-wheel caller).
function projectUp(v){
 const dot=add(add(mul(v[1],1),mul(0,v[0])),mul(v[2],0));
 return vector(i=>f(mul(i===1?1:0,dot)));
}

// Original 0x4aa573..0x4aaa55, including both sequential pitch clips.
export function assembleMcmPairedContactForces(c){
 if((c.state844&&c.chassisContact.enabled)||!c.bothContact)return;
 const s=c.pairedContactForce,t=c.singleContactForce;
 s.rearNormal=vector(i=>f(mul(c.points[5][i],c.rearMotion.normalLoad)));
 s.frontNormal=vector(i=>f(mul(c.frontMotion.normalLoad,c.points[4][i])));
 s.rearProjection=projectUp(c.suspensionForces.rear.force);
 c.rearLoad.force=vector(i=>f(add(mul(c.targetRollCos,s.rearProjection[i]),c.rearLoad.force[i])));
 s.frontProjection=projectUp(c.suspensionForces.front.force);
 c.frontLoad.force=vector(i=>f(add(mul(c.targetRollCos,s.frontProjection[i]),c.frontLoad.force[i])));
 c.frontLoad.force=vector(i=>f(add(c.frontLoad.force[i],s.frontNormal[i])));
 c.rearLoad.force=vector(i=>f(add(c.rearLoad.force[i],s.rearNormal[i])));
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
