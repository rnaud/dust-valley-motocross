import {evaluateResetLinearIntegration} from './reset-linear-integration-case.mjs';
import {updateMcmResetMotionTransform} from '../../src/physics/mcm/reset-motion-transform.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';

export function evaluateResetMotionTransform(input,step=updateMcmResetMotionTransform){
 let p;
 const words=evaluateResetLinearIntegration(input,c=>{
  const s=c.contactPhase.motionTransform;
  s.front={scale:bitsFloat(input.words[818+0x48/4])};s.rear={scale:bitsFloat(input.words[842+0x48/4])};
  const result=step(c);p=c.contactPhase;return result;
 });
 return [...words,...[p.motionTransform.signedDt,p.motionTransform.rearDelta,p.motionTransform.angle].map(floatBits)];
}
