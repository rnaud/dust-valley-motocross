import {evaluateResetNextControls} from './reset-next-controls-case.mjs';
import {continueMcmResetLoopEvent} from '../../src/physics/mcm/reset-loop-event.js';
import {resetLoopEventWords} from './reset-loop-event-case.mjs';
export function evaluateResetNextEvent(input,observe){
 let words=Array(188).fill(0),eventReached=false;
 const result=evaluateResetNextControls(input,(c,route)=>{
  continueMcmResetLoopEvent(c);words=resetLoopEventWords(c);eventReached=true;
  observe?.(c,route);
 });
 return {...result,tail:[...result.tail,...words],eventReached};
}
