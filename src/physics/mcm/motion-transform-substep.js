import {updateMcmLinearIntegrationSubstep} from './linear-integration-substep.js';
import {floatBits} from './math.js';
import {mcmAdd as add,mcmMultiply as mul} from './x87-arithmetic.js';
import {rotateMcmTransform,rotateMcmTransformAtPivot} from './transform.js';
import {prepareMcmRotation} from './rotation-step.js';
import {invalidateMcmTransform} from './event-orientation.js';
const f=Math.fround,signed=x=>floatBits(x)|0;

// Original 0x4ab49e..0x4ab7fd. Mutate each node in call order: wheels and body
// can alias, and invalidation follows the actual parent/child graph.
export function updateMcmSubstepMotionTransforms(c){
 const s=c.motionTransform,w=[s.front,s.rear],nodes=[c.frontNode,c.rearNode];
 const apply=i=>{if(Number.isFinite(w[i].angle)){nodes[i].local=rotateMcmTransform(nodes[i].local,[1,0,0],w[i].angle);invalidateMcmTransform(nodes[i]);}};
 const move=(i,distance)=>{w[i].angle=f(mul(w[i].scale,distance));apply(i);};
 const freeRear=()=>{if(signed(s.engineLevel)<0x3f800000&&(floatBits(s.engineLevel)&0x7fffffff)!==0)w[1].angle=f(mul(s.engineLevel,6));};
 if(!c.anyContact){
  if(c.state844===2)for(const wheel of w)wheel.angle=f(mul(wheel.angle,f(.95)));
  else if((floatBits(c.brakeInput)&0x7fffffff)!==0)for(const wheel of w)wheel.angle=f(mul(wheel.angle,1-c.brakeInput));
  else freeRear();
  apply(0);apply(1);
 }else{
  s.signedDt=c.steeringFlag?c.dt:f(-c.dt);
  const delta=()=>{s.rearDelta=f(mul(mul(mul(c.traction.inverseMass,c.driveScalar),c.dt),c.traction.scratch[1]));};
  const rearMove=()=>move(1,f(add(mul(c.rearMotion.forwardMagnitude,s.signedDt),s.rearDelta)));
  if(c.bothContact){
   if(signed(c.frontMotion.forwardMagnitude)>0x3dcccccd)move(0,f(mul(c.frontMotion.forwardMagnitude,s.signedDt)));
   delta();if(signed(c.rearMotion.forwardMagnitude)>0x3dcccccd)rearMove();
  }else if(c.frontContact){move(0,f(mul(c.frontMotion.forwardMagnitude,s.signedDt)));freeRear();apply(1);}
  else{apply(0);delta();rearMove();}
 }
 c.bodyNode.local.splice(12,3,...c.bodyPosition);invalidateMcmTransform(c.bodyNode);
 const r=prepareMcmRotation({angularVelocity:[...c.chassisResponse.angularXY,c.field53c],previousAxis:c.offset,dt:c.dt});
 s.angle=r.angle;c.offset=r.axis;
 if(r.apply){c.bodyNode.local=rotateMcmTransformAtPivot(c.bodyNode.local,c.chassisResponse.localLever,r.axis,r.angle);invalidateMcmTransform(c.bodyNode);}
}
export function updateMcmMotionTransformSubstep(c){
 const r=updateMcmLinearIntegrationSubstep(c);updateMcmSubstepMotionTransforms(c);return r;
}
