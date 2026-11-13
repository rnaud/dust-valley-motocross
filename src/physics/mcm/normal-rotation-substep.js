import {updateMcmNormalControlSubstep} from './normal-control-substep.js';
import {updateMcmStateZeroRotation} from './state-zero-rotation.js';
import {bitsFloat,floatBits} from './math.js';
import {invalidateMcmTransform} from './event-orientation.js';

// Original 0x4abef9..0x4ac17b, preserving the preceding control gates.
export function updateMcmNormalRotationSubstep(c){
 const result=updateMcmNormalControlSubstep(c);
 applyMcmSubstepNormalRotation(c);return result;
}

export function applyMcmSubstepNormalRotation(c){
 if(c.state844||c.frontSuspension.contactLimited||c.rearSuspension.contactLimited||!c.field4bc)return;
 const angularVelocity=new Float64Array(3);
 angularVelocity[0]=c.chassisResponse.angularXY[0];angularVelocity[1]=c.chassisResponse.angularXY[1];angularVelocity[2]=c.field53c;
 const r=updateMcmStateZeroRotation({timer:bitsFloat(c.fieldc6c),dt:c.dt,previousSign:c.fieldc70,accumulator:c.fieldc74,phase:c.fieldc78,field4d8:c.roll,field48:c.turnScale,angularVelocity,controlVector:c.normalControl.vector,matrix:c.bodyNode.local,pivot:c.localBalanceCenter,cacheValid:c.bodyNode.cacheValid});
 c.fieldc6c=floatBits(r.timer);c.fieldc70=r.previousSign;c.fieldc74=r.accumulator;c.fieldc78=r.phase;
 c.chassisResponse.angularXY=r.angularVelocity.slice(0,2);c.field53c=r.angularVelocity[2];
 c.normalControl.vector=r.controlVector;c.normalRotation.angle=r.angle;
 if(r.applied){c.bodyNode.local.splice(0,16,...r.matrix);invalidateMcmTransform(c.bodyNode);}
 return;
}
