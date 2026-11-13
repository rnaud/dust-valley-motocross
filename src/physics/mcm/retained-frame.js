import {beginMcmFrame} from './frame-entry.js';
import {recoverMcmFrameEntry} from './frame-recovery-entry.js';
import {prepareMcmFrameInput} from './frame-input.js';
import {prepareMcmFrameSteering} from './frame-steering.js';
import {decideMcmFrameReset} from './frame-reset-decision.js';
import {prepareMcmFrameTerrain} from './frame-terrain-entry.js';
import {prepareMcmFrameEngine} from './frame-engine-entry.js';
import {prepareMcmFrameContacts} from './frame-contact-entry.js';
import {continueMcmResetLoopEntry} from './reset-loop-entry.js';
import {continueMcmResetLoopContact} from './reset-loop-contact.js';
import {continueMcmResetLoopResponse} from './reset-loop-response.js';
import {continueMcmResetLoopTireForces} from './reset-loop-tire-forces.js';
import {continueMcmResetLoopMotion} from './reset-loop-motion.js';
import {continueMcmResetLoopControls} from './reset-loop-controls.js';
import {continueMcmResetLoopEvent} from './reset-loop-event.js';
import {continueMcmResetLoopRider} from './reset-loop-rider.js';
import {continueMcmResetLoopFinish} from './reset-loop-finish.js';
import {beginMcmPostLoop,updateMcmFrameAcceleration} from './frame-acceleration-filter.js';
import {updateMcmRetainedFrameRider} from './retained-frame-rider.js';
import {finishMcmFrame} from './frame-return.js';

// Advance an already initialized original-bike context. Assets, terrain,
// controllers and random inputs belong to the caller and are never reseeded.
// Observers see the live context at original boundaries and must not mutate it.
export function advanceMcmRetainedFrame(c,{delta,mode,input},observe){
 const emit=(stage,result)=>observe?.(stage,c,result);
 const scheduler=beginMcmFrame(c,delta);emit('entry',scheduler);
 const recovery=recoverMcmFrameEntry(c,mode);
 const tokens=o=>[o.stopped,o.record?.token??0,o.frame.token,o.field30,o.blending];
 c.loopRider.bikeAnimation=tokens(c.frameRider.bikeAnimation);
 c.loopRider.riderAnimation=tokens(c.frameRider.riderAnimation);
 emit('recovery',recovery);
 const controller=prepareMcmFrameInput(c,input);emit('input',controller);
 if(controller.pendingController)return {status:'pending-controller',controller:controller.pendingController,substeps:0};
 const steering=prepareMcmFrameSteering(c,controller.branch);emit('steering',steering);
 const reset=decideMcmFrameReset(c,delta);emit('reset',reset);
 const terrain=prepareMcmFrameTerrain(c,reset.code);emit('terrain',terrain);
 const engine=prepareMcmFrameEngine(c);emit('engine',engine);
 // Negative synthetic schedules are a separately exposed, unconnected boundary.
 if(!engine)return {status:'no-iterations',substeps:0};
 const contact=prepareMcmFrameContacts(c,reset.code);emit('contact',contact);
 let substeps=0;
 for(;;){
  continueMcmResetLoopResponse(c);emit('response');
  continueMcmResetLoopTireForces(c);emit('tires');
  continueMcmResetLoopMotion(c);emit('motion');
  const controls=continueMcmResetLoopControls(c);emit('controls',controls);
  continueMcmResetLoopEvent(c);emit('event');
  continueMcmResetLoopRider(c);emit('rider');
  continueMcmResetLoopFinish(c);substeps++;emit('finish',{substeps});
  if((c.contactPhase.control20|0)<=0)break;
  const nextEngine=continueMcmResetLoopEntry(c);emit('engine',nextEngine);
  continueMcmResetLoopContact(c);emit('contact',{branch:'ordinary',randomCalls:0});
 }
 c.frameTail.frameDelta=scheduler.storedInterval;
 emit('before-filter');beginMcmPostLoop(c);
 const filter=updateMcmFrameAcceleration(c);emit('filter',{...filter,substeps});
 const rider=updateMcmRetainedFrameRider(c,delta);emit('frame-rider',rider);
 emit('before-return');finishMcmFrame(c);emit('return');
 return {status:'returned',substeps,controller:controller.branch,recovery,reset:reset.branch};
}
