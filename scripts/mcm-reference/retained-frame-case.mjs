import {evaluateResetFrameReturn} from './reset-frame-return-case.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {frameRiderEntryWords} from './frame-rider-entry-case.mjs';
import {substepStartWords} from './substep-start-case.mjs';
import {resetLoopFinishWords} from './reset-loop-finish-case.mjs';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';

export function captureRetainedFrame(c,options,observe){
 let output=Array(11244).fill(0),finishes=[],engines=[],frame;
  const cycle=new Error('Original reset avoidance repeated state'),history=[];
  c.observeResetAvoidance=({position,forward,nearest,flag})=>{
   const snapshot=[...Array.from(position,floatBits),...Array.from(forward,floatBits),c.bikes.indexOf(nearest),flag>>>0];
   if(history.some(v=>v.every((x,i)=>x===snapshot[i])))throw cycle;
   if(history.length===128)history.shift();history.push(snapshot);
  };
  let before,returnBefore;
  try{frame=advanceMcmRetainedFrame(c,options,(stage,c,result)=>{
   const b=c.bike;
   if(stage==='engine'&&result)engines.push(substepStartWords(c.engineEntry,result));
   if(stage==='finish')finishes.push(resetLoopFinishWords(c));
   if(stage==='before-filter')before=[floatBits(b.field854),floatBits(c.frameTail.filter.value),floatBits(b.field850),b.field8c0>>>0];
   if(stage==='filter'){
    output=[b.field8c0>>>0,...Array.from(b.offset,floatBits),floatBits(result.acceleration),floatBits(b.field850),floatBits(b.field854),floatBits(c.frameTail.filter.value),floatBits(c.frameTail.filter.duration),floatBits(c.frameEntry.storedInterval),result.substeps];
    for(const n of c.bounds.components)output.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
    output.push(...before);
   }
   if(stage==='frame-rider'){
    const a=c.frameRider,words=frameRiderEntryWords(c);words[55]=floatBits(a.riderAnimation.remainder);
    for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
    for(const o of [a.bikeAnimation,a.riderAnimation])words.push(o.displayedFrame.index>>>0,o.previousFrame.index>>>0,floatBits(o.blendTime),floatBits(o.blendDuration));
    words.push(result.queries.length,result.queries[0]??0,result.queries[1]??0);
    for(const child of [...a.allChildren,...c.bounds.children])words.push(...[child.forward,child.up,child.position].flatMap(v=>Array.from(v,floatBits)));
    output.push(...words);
   }
   if(stage==='before-return')returnBefore=[...Array.from(b.savedPosition,floatBits),...Array.from(b.position,floatBits)];
   if(stage==='return'){
    output.push(b.field568,...Array.from(b.savedPosition,floatBits));
    for(const n of c.bounds.components)output.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
    output.push(...returnBefore,1);
   }
   observe?.(stage,c,result);
  });}catch(error){if(error!==cycle)throw error;frame={status:'original-nonterminating',substeps:0};}
 return {output,finishes,engines,frame};
}

export function evaluateRetainedFrame(input,observe){
 let captured,context;
 const prior=evaluateResetFrameReturn(input,c=>{
  context=c;
  c.resetDecision={setting:input.selection[1],mode:input.selection[0],worldScale:input.selection[11],controllerPresent:true,queryReset:()=>input.frameReset.pressed};
  captured=captureRetainedFrame(c,{delta:bitsFloat(input.nextFrame.deltaBits),mode:input.selection[0],input:input.frameInput});
  observe?.(c,captured.frame);
 });
 return {prior,...captured,context};
}
