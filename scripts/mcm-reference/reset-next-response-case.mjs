import {evaluateResetNextContact} from './reset-next-contact-case.mjs';
import {continueMcmResetLoopResponse} from '../../src/physics/mcm/reset-loop-response.js';
import {resetLoopResponseWords} from './reset-loop-response-case.mjs';
export function evaluateResetNextResponse(input,observe){
 let words=Array(202).fill(0),responseReached=false;
 const result=evaluateResetNextContact(input,c=>{
  continueMcmResetLoopResponse(c);words=resetLoopResponseWords(c);responseReached=true;
  observe?.(c);
 });
 return {...result,tail:[...result.tail,...words],responseReached};
}
