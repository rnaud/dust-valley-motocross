import {evaluateResetNextEngine} from './reset-next-engine-case.mjs';
import {prepareMcmFrameContacts} from '../../src/physics/mcm/frame-contact-entry.js';
import {resetLoopContactWords} from './reset-loop-contact-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextContact(input){
 let words=Array(267).fill(0),contactBranch='pending';
 const result=evaluateResetNextEngine(input,(c,decision,reached)=>{
  if(!reached){words[0]=1;contactBranch='no-iterations';return;}
  const cycle=new Error('Original reset avoidance repeated state'),history=[];
  c.observeResetAvoidance=({position,forward,nearest,flag})=>{const snapshot=[...Array.from(position,floatBits),...Array.from(forward,floatBits),c.bikes.indexOf(nearest),flag>>>0];if(history.some(v=>v.every((x,i)=>x===snapshot[i]))){cycle.snapshot=snapshot;throw cycle;}if(history.length===128)history.shift();history.push(snapshot);};
  let r;try{r=prepareMcmFrameContacts(c,decision.code);}catch(error){if(error!==cycle)throw error;contactBranch='original-nonterminating';words=[4,decision.code,...Array(6).fill(0),...cycle.snapshot,...Array(251).fill(0)];return;}
  const e=c.frameEntry,b=c.bike,engine=c.engine;contactBranch=r.branch;
  words=[decision.code?3:2,decision.code,c.resetReason,r.randomCalls,e.control1c,e.control30,e.control2c,floatBits(c.contactPhase.componentRate),...resetLoopContactWords(c,{looped:true})];
  for(const field of ['844','88c','8c0','cb4','814','8ac'])words.push(b[`field${field}`]>>>0);
  for(const field of ['position','savedPosition','forward','up','velocity','acceleration','angularVelocity','worldAngularVelocity','localLever','axis624'])words.push(...Array.from(b[field],floatBits));
  words.push(engine.released,engine.gear,...[engine.state,engine.rpmDemand,engine.previousRpmDemand,engine.shiftTimer,engine.shiftThreshold].map(floatBits),...Array.from(c.effect,floatBits));
  for(const child of c.bounds.children)words.push(...[child.forward,child.up,child.position].flatMap(v=>Array.from(v,floatBits)));
 });
 return {...result,tail:[...result.tail,...words],contactBranch};
}
