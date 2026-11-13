import {evaluateRetainedFrame,captureRetainedFrame} from './retained-frame-case.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';
export const HISTORY_FRAMES=400;
export function evaluateRetainedHistory(input,observe){
 const initial=evaluateRetainedFrame(input),c=initial.context;
 if(initial.frame.status!=='returned')throw new Error('History requires a completed retained frame');
 c.resetDecision.queryReset=()=>false;
 for(let frame=0;frame<HISTORY_FRAMES;frame++){
  const pressed=frame>=50&&frame<200;
  c.engineEntry.input.brakeResponses=[0,0,0,0,0,0];
  c.engineEntry.input.throttleResponses=[+pressed,0,0,0,0,0];
  const result=captureRetainedFrame(c,{delta:Math.fround(.02),mode:input.selection[0],input:{...input.frameInput,analogBits:floatBits(+pressed)}});
  observe?.(result,{frame,pressed,context:c});
 }
 return initial;
}
