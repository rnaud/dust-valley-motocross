import {evaluateFinishedSubstep} from './finished-substep-case.mjs';
import {updateMcmPreparedSubstep} from '../../src/physics/mcm/prepared-substep.js';
export function evaluatePreparedSubstep(input){return evaluateFinishedSubstep(input,updateMcmPreparedSubstep);}
