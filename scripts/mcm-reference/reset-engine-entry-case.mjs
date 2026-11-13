import {evaluateResetCollisionDispatch} from './reset-collision-dispatch-case.mjs';
import {updateMcmResetEngineEntry} from '../../src/physics/mcm/reset-engine-entry.js';
import {substepStartWords} from './substep-start-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetEngineEntry(input){
 let c,entryWords;
 const words=evaluateResetCollisionDispatch(input,state=>{
  c=state;const s=c.engineEntry=structuredClone(input.entry),b=c.bike;
  Object.assign(c.engine,s.engine);s.engine=c.engine;
  for(const [key,value] of Object.entries({field844:s.state844,field5e4:s.brake,fieldb04:s.aiThrottle,fieldb08:s.aiBrake,mass:s.mass,inverseMass:s.inverseMass,field680:s.alternateMass,field678:s.alternateInverseMass,field684:s.field684,field694:s.field694,field6a4:s.speed,field564:s.previousSpeed,velocity:s.velocity,field84c:s.previousY,field848:s.filteredAcceleration}))b[key]=value;
  c.observeEngineEntry=(s,result)=>{entryWords=substepStartWords(s,result);};
  return updateMcmResetEngineEntry(c);
 });
 // Integer AI-demand fields and engine constants are supplied initial state.
 words[0xb04/4]=input.entry.aiThrottle>>>0;words[0xb08/4]=input.entry.aiBrake>>>0;
 return [...words,floatBits(c.contactPhase.dt),floatBits(c.contactPhase.turnScale),c.finishPrior.remaining>>>0,floatBits(c.finishPrior.carry),...entryWords,floatBits(c.engine.analogFilter.value),floatBits(c.engineEntry.accelerationFilter.value)];
}
