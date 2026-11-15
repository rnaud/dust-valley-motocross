// Original 0x47d606..0x47d71f. The mode-6 transition overrides both outputs;
// other reset-flag frames preserve the target when usePrevious is set.
export function finishMcmChaseSmoothing(state,result,{mode,actorType,usePrevious}){
 let target=Float32Array.from(result.target),eye=Float32Array.from(result.eye);
 if(state.previousMode===6){
  state.eyeResetFlag=1;state.previousMode=mode;
  for(let i=0;i<6;i++){state.filters[i][0]=result.targets[i];state.filters[i][1]=Math.fround(actorType===1?.25:.3);}
  target=result.targets.slice(0,3);eye=result.targets.slice(3,6);
 }else if(state.eyeResetFlag){
  eye=result.targets.slice(3,6);
  if(!usePrevious)target=result.targets.slice(0,3);
 }
 state.target=Float32Array.from(target);
 return {target,eye};
}
