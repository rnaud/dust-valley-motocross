import {evaluateResetEngineEntry} from './reset-engine-entry-case.mjs';
import {updateMcmResetEngineEntry} from '../../src/physics/mcm/reset-engine-entry.js';
import {continueMcmResetLoopEntry} from '../../src/physics/mcm/reset-loop-entry.js';
import {substepStartWords} from './substep-start-case.mjs';
export function evaluateResetLoopEntry(input){
 let c;
 const words=evaluateResetEngineEntry(input,state=>{c=state;return updateMcmResetEngineEntry(c);});
 const result=continueMcmResetLoopEntry(c);
 return [...words,+result.looped,...(result.looped?substepStartWords(c.engineEntry,result):Array(33).fill(0))];
}
