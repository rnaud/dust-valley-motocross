import {applyMcmBikeContactResponse} from './reset-contact-response.js';

// Second iteration after ordinary wheel contact; no prefix is re-executed.
export function continueMcmResetLoopResponse(c){applyMcmBikeContactResponse(c);}
