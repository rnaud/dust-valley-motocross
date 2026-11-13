import {updateMcmNormalRotationSubstep} from './normal-rotation-substep.js';
import {floatBits} from './math.js';
import {mcmAdd as add,mcmMultiply as mul,mcmSubtract as sub} from './x87-arithmetic.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {rotateMcmTransformAtPivot} from './transform.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround,bits=floatBits,signed=v=>bits(v)|0,sign=v=>bits(v)>0x80000000?-1:1;

// Original grounded branch 0x4ac1f7..0x4ac5c5. World-cache resolution and
// local pivot mutations occur in original order, including aliased nodes.
export function updateMcmNormalAlignmentSubstep(c){
 const result=updateMcmNormalRotationSubstep(c);
 alignMcmSubstepGroundContact(c);
 return result;
}

export function alignMcmSubstepGroundContact(c){
 if(c.state844||c.frontSuspension.contactLimited||c.rearSuspension.contactLimited||c.field4bc)return;
 const s=c.normalAlignment,mask=c.contactCorrection.mask;
 if(!mask){c.field6b0=0;return;}
 const rotate=(axis,angle)=>{c.bodyNode.local=rotateMcmTransformAtPivot(c.bodyNode.local,c.frontLoad.localArm,axis,angle);invalidateMcmTransform(c.bodyNode);};
 if(mask===1){
  if(c.bothContact&&(signed(c.chassisContact.absTurn)>=0x38d1b717||Math.abs(c.linearIntegration.rotation)>f(.0001))){
   c.offset=[...c.points[5]];c.controllerHandoff.axis=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.offset);
   const rotation=c.linearIntegration.rotation;
   const angle=(bits(rotation)&0x7fffffff)!==0&&signed(c.chassisContact.absTurn)<0x3a83126f?rotation:f(add(c.frontLoad.turnAngle,rotation));
   rotate(c.controllerHandoff.axis,angle);
   c.chassisResponse.angularXY=c.chassisResponse.angularXY.map(v=>f(mul(v,f(.9))));c.field53c=f(mul(c.field53c,f(.9)));
  }
 }else c.field6b0=0;
 s.angle=f(mul(add(mul(c.componentAngle,f(.05)),mul(c.field6b0,f(.2))),c.rearAlignment));
 const magnitude=Math.abs(s.angle);
 if((bits(c.linearIntegration.angle)&0x7fffffff)!==0&&(bits(c.driveScalar)&0x7fffffff)===0&&f(.087)>magnitude)s.angle=f(sign(c.linearIntegration.angle)*f(.087));
 if(!(s.limit>=magnitude))s.angle=f(sign(s.angle)*s.limit);
 c.contactCorrection.angle=f(sub(c.targetRoll,s.angle));
 const angle=c.contactCorrection.angle;
 if(Number.isFinite(angle)&&Math.abs(angle)>=f(.0001)){
  const rate=sign(c.roll)===sign(angle)?f(mul(s.rate,f(.8))):s.rate;
  if(mul(c.turnScale,Math.abs(angle))>rate)c.contactCorrection.angle=f(mul(mul(c.dt,sign(angle)),rate));
  if(c.anyContact){
   s.local=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.contactDirection);
   if(s.local.some(v=>Math.abs(v)>f(.001)))rotate(s.local,c.contactCorrection.angle);
  }
 }
 return;
}
