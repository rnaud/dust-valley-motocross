import {floatBits} from '../../src/physics/mcm/math.js';
import {evaluateResetNextFinish} from './reset-next-finish-case.mjs';
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
export function evaluateResetNextLoop(input,observe){
 const records=[];let loopCount=0;
 const result=evaluateResetNextFinish(input,c=>{
  loopCount=1;
  while((c.contactPhase.control20|0)>0){
   if(loopCount>=11)throw new Error('Next loop capacity');
   const p=c.contactPhase,e=c.frameEntry,b=c.bike;
   const header=[2,p.control20>>>0,floatBits(p.dt),floatBits(p.turnScale),floatBits(e.analog),p.control1c,p.control30,p.control2c,c.resetReason];
   const entry=continueMcmResetLoopEntry(c);
   const words=[...header,...substepStartWords(c.engineEntry,entry),...Array.from(p.totalTorque,floatBits),floatBits(p.traction.scratch[0]),floatBits(p.frontLoad.turnAngle),p.contactCorrection.mask,floatBits(p.frontTire.alignment),floatBits(p.traction.tire.alignment),floatBits(p.frontTire.perpendicular),floatBits(p.traction.tire.perpendicular)];
   continueMcmResetLoopContact(c);
   words.push(2,0,c.resetReason,0,p.control1c,p.control30,p.control2c,floatBits(p.componentRate),...resetLoopContactWords(c,{looped:true}));
   for(const field of ['844','88c','8c0','cb4','814','8ac'])words.push(b[`field${field}`]>>>0);
   for(const field of ['position','savedPosition','forward','up','velocity','acceleration','angularVelocity','worldAngularVelocity','localLever','axis624'])words.push(...Array.from(b[field],floatBits));
   const engine=c.engine;words.push(engine.released,engine.gear,...[engine.state,engine.rpmDemand,engine.previousRpmDemand,engine.shiftTimer,engine.shiftThreshold].map(floatBits),...Array.from(c.effect,floatBits));
   for(const child of c.bounds.children)words.push(...[child.forward,child.up,child.position].flatMap(v=>Array.from(v,floatBits)));
   continueMcmResetLoopResponse(c);words.push(...resetLoopResponseWords(c));
   continueMcmResetLoopTireForces(c);words.push(...resetLoopTireForcesWords(c));
   continueMcmResetLoopMotion(c);words.push(...resetLoopMotionWords(c));
   const route=continueMcmResetLoopControls(c);words.push(...resetLoopControlsWords(c,route));
   continueMcmResetLoopEvent(c);words.push(...resetLoopEventWords(c));
   continueMcmResetLoopRider(c);words.push(...resetLoopRiderWords(c));
   const s=c.loopRider;words.push(b.field824>>>0,floatBits(b.field82c),floatBits(b.field830),floatBits(b.field834),s.nearby===undefined?+!!b.field838:+!!s.nearby,...s.riderBounds.map(floatBits));
   continueMcmResetLoopFinish(c);words.push(...resetLoopFinishWords(c));
   if(words.length!==2168)throw new Error(`Loop record length ${words.length}`);
   records.push(...words);loopCount++;
  }
  observe?.(c);
 });
 return {...result,tail:[...result.tail,loopCount,...records,...Array(21680-records.length).fill(0)],loopCount};
}
