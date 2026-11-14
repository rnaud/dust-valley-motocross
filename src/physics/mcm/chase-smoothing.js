import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
// Original 0x47d477..0x47d606. Six retained [value, time, upper, lower]
// records; this block does not apply their upper/lower bounds. Targets are
// supplied by the still-unrecovered chase controller, not recorded outputs.
export function stepMcmChaseSmoothing(filters,targets,delta){
 const f=Math.fround,dt=f(delta),values=new Float32Array(6);
 for(let i=0;i<6;i++){
  const record=filters[i] instanceof Float32Array?filters[i]:(filters[i]=Float32Array.from(filters[i])),value=f(record[0]),time=f(record[1]);
  // Equal/unordered x87 comparisons select time, including signed zero.
  const elapsed=time>dt?dt:time;
  const next=f(add(mul(sub(f(targets[i]),value),div(elapsed,time)),value));
  record[0]=next;values[i]=next;
 }
 return {target:values.slice(0,3),eye:values.slice(3)};
}
