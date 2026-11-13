import {floatBits} from '../../src/physics/mcm/math.js';
import {evaluateResetThirdFinish} from './reset-third-finish-case.mjs';
import {continueMcmResetLoopEntry} from '../../src/physics/mcm/reset-loop-entry.js';
import {continueMcmResetLoopContact} from '../../src/physics/mcm/reset-loop-contact.js';
import {substepStartWords} from './substep-start-case.mjs';
import {resetLoopContactWords} from './reset-loop-contact-case.mjs';
import {continueMcmResetLoopResponse} from '../../src/physics/mcm/reset-loop-response.js';
import {resetLoopResponseWords} from './reset-loop-response-case.mjs';
import {continueMcmResetLoopTireForces} from '../../src/physics/mcm/reset-loop-tire-forces.js';
import {resetLoopTireForcesWords} from './reset-loop-tire-forces-case.mjs';
import {continueMcmResetLoopMotion} from '../../src/physics/mcm/reset-loop-motion.js';
import {resetLoopMotionWords} from './reset-loop-motion-case.mjs';
import {continueMcmResetLoopControls} from '../../src/physics/mcm/reset-loop-controls.js';
import {resetLoopControlsWords} from './reset-loop-controls-case.mjs';
import {continueMcmResetLoopEvent} from '../../src/physics/mcm/reset-loop-event.js';
import {resetLoopEventWords} from './reset-loop-event-case.mjs';
import {continueMcmResetLoopRider} from '../../src/physics/mcm/reset-loop-rider.js';
import {resetLoopRiderWords} from './reset-loop-rider-case.mjs';
import {continueMcmResetLoopFinish} from '../../src/physics/mcm/reset-loop-finish.js';
import {resetLoopFinishWords} from './reset-loop-finish-case.mjs';
export function evaluateResetLoopCompletion(input){
 let tail=Array(2068).fill(0);
 const words=evaluateResetThirdFinish(input,(c,{looped})=>{
  if(!looped)return;
  const entry=continueMcmResetLoopEntry(c);if(!entry.looped)return;
  const engine=substepStartWords(c.engineEntry,entry);continueMcmResetLoopContact(c);
  tail=[1,...engine,...resetLoopContactWords(c,entry)];
  continueMcmResetLoopResponse(c);tail.push(...resetLoopResponseWords(c));
  continueMcmResetLoopTireForces(c);tail.push(...resetLoopTireForcesWords(c));
  continueMcmResetLoopMotion(c);tail.push(...resetLoopMotionWords(c));
  const route=continueMcmResetLoopControls(c);tail.push(...resetLoopControlsWords(c,route));
  continueMcmResetLoopEvent(c);tail.push(...resetLoopEventWords(c));
  continueMcmResetLoopRider(c);tail.push(...resetLoopRiderWords(c));
  const b=c.bike,s=c.loopRider;
  const nearby=[b.field824>>>0,floatBits(b.field82c),floatBits(b.field830),floatBits(b.field834),s.nearby===undefined?+!!b.field838:+!!s.nearby,...s.riderBounds.map(floatBits)];
  continueMcmResetLoopFinish(c);tail.push(...resetLoopFinishWords(c),...nearby);
 });return [...words,...tail];
}
