import {evaluateResetEngineEntry} from './reset-engine-entry-case.mjs';
import {updateMcmResetEngineEntry} from '../../src/physics/mcm/reset-engine-entry.js';
import {continueMcmResetLoopEntry} from '../../src/physics/mcm/reset-loop-entry.js';
import {continueMcmResetLoopContact} from '../../src/physics/mcm/reset-loop-contact.js';
import {substepStartWords} from './substep-start-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopContact(input){
 let c;
 const words=evaluateResetEngineEntry(input,state=>{c=state;c.contactPhase.componentRate=input.loopComponentRate;return updateMcmResetEngineEntry(c);});
 const result=continueMcmResetLoopEntry(c),entry=result.looped?substepStartWords(c.engineEntry,result):Array(33).fill(0);
 if(result.looped)continueMcmResetLoopContact(c);
 const b=c.bike;
 const contact=result.looped?[...Array.from(b.referencePosition,floatBits),...c.points.flatMap(v=>Array.from(v,floatBits)),...Array.from(c.heights,floatBits),...[b.tangent,b.rearTangent,b.normal,b.offset].flatMap(v=>Array.from(v,floatBits)),floatBits(b.field6b0),floatBits(c.componentAngle),floatBits(b.field888),b.field8ac>>>0,...c.bounds.components.flatMap(n=>[...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid]),c.suspension.front.limited>>>0,c.suspension.rear.limited>>>0]:Array(185).fill(0);
 return [...words,+result.looped,...entry,...contact];
}
