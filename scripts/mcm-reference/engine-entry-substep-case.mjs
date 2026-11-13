import {evaluatePreparedSubstep} from './prepared-substep-case.mjs';
import {prepareMcmEngineEntry} from '../../src/physics/mcm/engine-entry-substep.js';
import {prepareMcmSubstep} from '../../src/physics/mcm/prepared-substep.js';
import {substepStartWords} from './substep-start-case.mjs';
import {updateMcmFinishedSubstep} from '../../src/physics/mcm/finished-substep.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateEngineEntrySubstep(input){
 let entry,prepared;
 const prefix=evaluatePreparedSubstep(input,c=>{const r=prepareMcmEngineEntry(c);entry=substepStartWords(c.engineEntry,r);prepareMcmSubstep(c);prepared=[0,1,8,9].flatMap(i=>c.points[i].map(floatBits));return updateMcmFinishedSubstep(c);});
 return [...prefix,...entry,...prepared];
}
