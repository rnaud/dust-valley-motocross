import {evaluateResetNextMotion} from './reset-next-motion-case.mjs';
import {continueMcmResetLoopControls} from '../../src/physics/mcm/reset-loop-controls.js';
import {resetLoopControlsWords} from './reset-loop-controls-case.mjs';
export function evaluateResetNextControls(input,observe){
 let words=Array(170).fill(0),controlRoute=0;
 const result=evaluateResetNextMotion(input,c=>{
  controlRoute=continueMcmResetLoopControls(c);words=resetLoopControlsWords(c,controlRoute);
  observe?.(c,controlRoute);
 });
 return {...result,tail:[...result.tail,...words],controlRoute};
}
