import {updateMcmResetLinearIntegration} from './reset-linear-integration.js';
import {updateMcmSubstepMotionTransforms} from './motion-transform-substep.js';

// Continuous reset path through 0x4ab7fd, including live wheel/body transforms.
export function updateMcmResetMotionTransform(c){
 const result=updateMcmResetLinearIntegration(c);
 applyMcmBikeMotionTransform(c);return result;
}

export function applyMcmBikeMotionTransform(c){
 const p=c.contactPhase;
 p.frontNode=c.frontNode;p.rearNode=c.rearNode;
 p.motionTransform.engineLevel=c.engine.state;
 p.motionTransform.front.angle=c.front.limited;p.motionTransform.rear.angle=c.rear.limited;
 updateMcmSubstepMotionTransforms(p);
 c.front.limited=p.motionTransform.front.angle;c.rear.limited=p.motionTransform.rear.angle;
 c.bike.offset=p.offset;

}
