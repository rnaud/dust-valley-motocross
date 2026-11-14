import {rotateMcmRuntimeVector} from './runtime-vector-rotation.js';
import {prepareMcmChaseTargets,initializeMcmChaseFilters} from './chase-preparation.js';
import {stepMcmChaseSmoothing} from './chase-smoothing.js';
const f=Math.fround;
// Original 0x47d166..0x47d211. Axis is shared mutable runtime state.
export function prepareMcmChaseOffset(axis,{source,angle,bank,lean,mode,enabled,offset}){
 if(mode===5||!enabled)return {active:false,offset:Float32Array.from(offset)};
 let vector=Float32Array.from(source),bankAxis=null,bankVector=null;
 if(mode===3){
  bankAxis=Float32Array.of(vector[2],0,-vector[0]);
  bankVector=rotateMcmRuntimeVector(vector,bankAxis,f(-(1-f(bank))*f(lean)));
  vector=bankVector;
 }
 return {active:true,offset:rotateMcmRuntimeVector(vector,axis,f(f(angle)*f(.7))),bankAxis,bankVector};
}
// Upstream locals remain supplied. Bypass branches preserve the earlier
// target rather than reconstructing it from base/offset.
export function stepMcmOffsetChase(state,input,delta){
 const rotation=prepareMcmChaseOffset(state.axis,input);
 let targets;
 if(rotation.active)targets=prepareMcmChaseTargets(state,{...input,offset:rotation.offset});
 else{
  targets=new Float32Array(6);targets.set(input.previousTarget);targets.set(input.eye,3);
  initializeMcmChaseFilters(state,targets,input.actorType);
 }
 return {rotation,targets,...stepMcmChaseSmoothing(state.filters,targets,delta)};
}
