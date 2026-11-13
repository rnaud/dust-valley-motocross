import {evaluateResetMotionTransform} from './reset-motion-transform-case.mjs';
import {updateMcmResetAlignment} from '../../src/physics/mcm/reset-alignment.js';
import {floatBits} from '../../src/physics/mcm/math.js';

export function evaluateResetAlignment(input,step=updateMcmResetAlignment){
 let p;
 const words=evaluateResetMotionTransform(input,c=>{const result=step(c);p=c.contactPhase;return result;});
 return [...words,...Array.from(p.normalAlignment.local,floatBits)];
}
