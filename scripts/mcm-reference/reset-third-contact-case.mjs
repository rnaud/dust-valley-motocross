import {evaluateResetLoopFinish} from './reset-loop-finish-case.mjs';
import {continueMcmResetLoopEntry} from '../../src/physics/mcm/reset-loop-entry.js';
import {continueMcmResetLoopContact} from '../../src/physics/mcm/reset-loop-contact.js';
import {substepStartWords} from './substep-start-case.mjs';
import {resetLoopContactWords} from './reset-loop-contact-case.mjs';

export function evaluateResetThirdContact(input){
 let tail=Array(219).fill(0);
 const words=evaluateResetLoopFinish(input,(c,{looped})=>{
  if(!looped)return;
  const entry=continueMcmResetLoopEntry(c);
  if(!entry.looped)return;
  const engine=substepStartWords(c.engineEntry,entry);
  continueMcmResetLoopContact(c);
  tail=[1,...engine,...resetLoopContactWords(c,entry)];
 });
 return [...words,...tail];
}
