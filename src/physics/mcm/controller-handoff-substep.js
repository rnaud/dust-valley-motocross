import {updateMcmMotionTransformSubstep} from './motion-transform-substep.js';
import {updateMcmControllerHandoff} from './controller-handoff.js';
import {floatBits} from './math.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {resolveMcmWorldMatrix,inverseRotateMcmVector} from './world-transform.js';
import {rotateMcmTransformAtPivot} from './transform.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround;

// Original 0x4ab7fd..0x4abb2b, exiting at 0x4abb30 for normal state and
// 0x4ac6cd for crash state. The controller update precedes crash orientation.
export function handoffMcmSubstepController(c){
 const s=c.controllerHandoff;
 const r=updateMcmControllerHandoff({
  state844:c.state844,controller13c:s.flag13c,controller140:c.contactCorrection.controller140,
  field8b4:s.kind,otherVelocity:s.other===2?c.velocity:s.other?s.otherVelocity:null,
  linearVelocity:c.velocity,angularVelocity:[...c.chassisResponse.angularXY,c.field53c],
  controllerVelocity:s.velocity,controllerAngularVelocity:s.angularVelocity,
 });
 s.velocity=r.velocity;s.angularVelocity=r.angularVelocity;
 if(!c.state844||c.control2c)return;
 if(c.bothContact){
  if((floatBits(c.chassisContact.absTurn)|0)<0x3a83126f)return;
  s.sum=c.points[5].map((v,i)=>f(add(v,c.points[4][i])));
  const [x,y,z]=s.sum,inverse=f(mcmInverseSqrtLookup(f(add(add(mul(y,y),mul(z,z)),mul(x,x)))));
  s.projection=s.sum.map(v=>f(mul(v,inverse)));c.offset=[...s.projection];
  s.axis=inverseRotateMcmVector(resolveMcmWorldMatrix(c.bodyNode),c.offset);
  c.bodyNode.local=rotateMcmTransformAtPivot(c.bodyNode.local,c.frontLoad.localArm,s.axis,c.frontLoad.turnAngle);
 }else if(c.frontContact){
  c.bodyNode.local=rotateMcmTransformAtPivot(c.bodyNode.local,c.frontLoad.localArm,[0,1,0],f(-c.componentRate));
 }else return;
 invalidateMcmTransform(c.bodyNode);
}
export function updateMcmControllerHandoffSubstep(c){
 const r=updateMcmMotionTransformSubstep(c);handoffMcmSubstepController(c);return r;
}
