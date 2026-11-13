import {applyMcmBikeFrontSuspension} from './reset-front-suspension.js';
import {applyMcmBikeSuspension} from './reset-suspension.js';
import {applyMcmBikeTireForces} from './reset-tire-forces.js';

// Second iteration from 0x4a6eac through tire/brake accumulation at 0x4a8be0.
export function continueMcmResetLoopTireForces(c){
 applyMcmBikeFrontSuspension(c);applyMcmBikeSuspension(c);applyMcmBikeTireForces(c);
}
