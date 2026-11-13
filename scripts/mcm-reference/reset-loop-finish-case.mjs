import {evaluateResetLoopRider} from './reset-loop-rider-case.mjs';
import {continueMcmResetLoopFinish} from '../../src/physics/mcm/reset-loop-finish.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetLoopFinish(input,observe){
 let tail=Array(498).fill(0);
 const words=evaluateResetLoopRider(input,(c,{looped})=>{
  if(!looped){observe?.(c,{looped});return;}
  continueMcmResetLoopFinish(c);tail=resetLoopFinishWords(c);
  observe?.(c,{looped});
 });return [...words,...tail];
}

export function resetLoopFinishWords(c) {
 let tail;
 const b=c.bike,p=c.contactPhase,r=c.rider,d=c.dispatch,m=d.manager,o=c.collisionState,w=m.objects[1];
  const integer=new Set(['844','8b8','8b4','8b0','8a8','714','870','710','820','814','884','8a4']);tail=[];
  for(const field of ['844','8b8','8b4','8b0','8a8','8c8','6a4','714','870','718','c7c','8d0','4e0','4dc','4d8','4e4','4e8','4ec','710','820','814','884','8a4','890'])tail.push(field==='8b0'?+!!b.field8b0:integer.has(field)?b[`field${field}`]>>>0:floatBits(b[`field${field}`]));
  for(const v of [b.position,b.velocity,b.angularVelocity,b.worldAngularVelocity,b.normal,b.offset,b.localLever,b.forward,b.up,b.savedHeading])tail.push(...Array.from(v,floatBits));
  tail.push(floatBits(c.component8e4.field58),floatBits(c.component8e8.field5c),...Array.from(c.effect,floatBits));
  for(const v of [r.previousVelocity,r.velocity,r.angularVelocity])tail.push(...Array.from(v,floatBits));
  tail.push(r.flag13c>>>0,r.field140>>>0,...r.selected.map(v=>v>>>0),r.active16c>>>0,r.kind>>>0);
  for(const n of c.bounds.components)tail.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
  tail.push(...Array.from(o.matrix,floatBits),typeof o.other==='object'?o.other?.token||0:o.other||0,...Array.from(o.worldCenter,floatBits));
  const id=x=>x?.id||0;
  for(const e of o.entries)tail.push(id(e.previous),id(e.next),e.owner,e.cell>>>0,e.other,e.active);
  for(const [i,cell] of c.grid.cells.entries())tail.push(id(cell.next),id(c.grid.markers[i].previous),id(c.grid.markers[i].next));
  tail.push(d.callbackCount,d.priorState,...m.pairs.flat(),floatBits(m.depth));
  for(const v of [m.contactCC,m.contactD8,m.contactE4,m.otherE4,o.contactCC,o.contactD8,o.contactE4,w.contactCC,w.contactD8,w.contactE4])tail.push(...Array.from(v,floatBits));
  tail.push(+(w.other===o),+(m.currentA===0),+(m.currentB===1),d.priorKind,floatBits(d.priorAngularX));
  tail.push(floatBits(p.dt),floatBits(p.turnScale),c.finishPrior.remaining>>>0,floatBits(c.finishPrior.carry),p.control20>>>0,+c.postState.awardCalled,p.normalEventDecision.randomCalls,p.normalEventDecision.inputCalls,p.normalEventDecision.triggered);

 return tail;
}
