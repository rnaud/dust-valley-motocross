import {evaluateRetainedFrame,captureRetainedFrame} from './retained-frame-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
import {createMcmRandom,connectMcmRandom} from '../../src/physics/mcm/random.js';
export const HISTORY_FRAMES=400;
export function evaluateRetainedHistory(input,observe,{randomSeed,burst=false}={}){
 const initial=evaluateRetainedFrame(input),c=initial.context;
 if(initial.frame.status!=='returned')throw new Error('History requires a completed retained frame');
 const random=randomSeed===undefined?null:createMcmRandom(randomSeed);
 if(random)connectMcmRandom(c,random);
 if(burst){c.bike.field848=50;c.bike.field73c=45;c.bike.field700=0;}
 c.resetDecision.queryReset=()=>false;
 for(let frame=0;frame<HISTORY_FRAMES;frame++){
  const pressed=frame>=50&&frame<200;
  c.engineEntry.input.brakeResponses=[0,0,0,0,0,0];
  c.engineEntry.input.throttleResponses=[+pressed,0,0,0,0,0];
  const result=captureRetainedFrame(c,{delta:Math.fround(.02),mode:input.selection[0],input:{...input.frameInput,...(burst&&frame===0?{longitudinalBits:floatBits(-1)}:{}),analogBits:floatBits(+pressed)}});
  observe?.(result,{frame,pressed,context:c,random});
 }
 return initial;
}
