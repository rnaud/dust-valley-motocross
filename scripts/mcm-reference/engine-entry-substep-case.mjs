import {evaluatePreparedSubstep} from './prepared-substep-case.mjs';
import {prepareMcmEngineEntry} from '../../src/physics/mcm/engine-entry-substep.js';
import {updateMcmPreparedSubstep} from '../../src/physics/mcm/prepared-substep.js';
import {substepStartWords} from './substep-start-case.mjs';
export function evaluateEngineEntrySubstep(input){
 let entry;
 const prefix=evaluatePreparedSubstep(input,c=>{const r=prepareMcmEngineEntry(c);entry=substepStartWords(c.engineEntry,r);return updateMcmPreparedSubstep(c);});
 return [...prefix,...entry];
}
