import {evaluateResetNextResponse} from './reset-next-response-case.mjs';
import {continueMcmResetLoopTireForces} from '../../src/physics/mcm/reset-loop-tire-forces.js';
import {continueMcmResetLoopMotion} from '../../src/physics/mcm/reset-loop-motion.js';
import {resetLoopTireForcesWords} from './reset-loop-tire-forces-case.mjs';
import {resetLoopMotionWords} from './reset-loop-motion-case.mjs';
export function evaluateResetNextMotion(input,observe){
 let words=Array(605).fill(0),motionReached=false;
 const result=evaluateResetNextResponse(input,c=>{
  continueMcmResetLoopTireForces(c);const tires=resetLoopTireForcesWords(c);
  continueMcmResetLoopMotion(c);words=[...tires,...resetLoopMotionWords(c)];motionReached=true;
  observe?.(c);
 });
 return {...result,tail:[...result.tail,...words],motionReached};
}
