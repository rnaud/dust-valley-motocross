import {prepareMcmContactTransforms} from './contact-preparation.js';
import {resetMcmSubstep} from './reset-substep.js';

// Original 0x4a5e27..0x4a64dc with a nonzero caller reset reason.
export function updateMcmPreparedResetSubstep(c){
 c.bike.referencePosition=prepareMcmContactTransforms(c.suspension).position;
 return resetMcmSubstep(c);
}
