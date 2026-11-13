import {prepareMcmResetEngineEntry} from './reset-engine-entry.js';

// Original 0x4ac94b loop branch and, when taken, 0x4a5bd7..0x4a5e27.
// State and filters are retained from the completed reset substep.
export function continueMcmResetLoopEntry(c){
 if((c.contactPhase.control20|0)<=0)return {looped:false};
 return {looped:true,...prepareMcmResetEngineEntry(c)};
}
