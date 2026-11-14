import {stepMcmChaseSmoothing} from './chase-smoothing.js';
const f=Math.fround,maximum=3.4028234663852886e38;
// Original 0x47d211..0x47d477. Inputs are earlier chase-controller outputs;
// they are not yet derived from retained bike/world state. Allocation failure
// and the original heap addresses are outside this numerical stage.
export function prepareMcmChaseTargets(state,{base,offset,eye,factor,distance,mode,actorType}){
 const scale=mode===6?-10:f(factor)*f(distance),targets=new Float32Array(6);
 for(let i=0;i<3;i++)targets[i]=f(f(base[i])+f(f(offset[i])*scale));
 targets[1]=f(targets[1]+3);targets.set(eye,3);
 initializeMcmChaseFilters(state,targets,actorType);
 return targets;
}
export function initializeMcmChaseFilters(state,targets,actorType){
 if(state.filters)return;
 const time=actorType===1?.25:f(.3);
 state.filters=Array.from(targets,value=>Float32Array.of(value,time,maximum,-maximum));
}
// Keep initialization and subsequent retained updates on the same path.
export function stepMcmPreparedChase(state,input,delta){
 const targets=prepareMcmChaseTargets(state,input);
 return {targets,...stepMcmChaseSmoothing(state.filters,targets,delta)};
}
