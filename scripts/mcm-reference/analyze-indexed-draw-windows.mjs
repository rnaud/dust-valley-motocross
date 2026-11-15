import assert from 'node:assert/strict';
// Boundary census only: a change narrows provenance to an interval, it does
// not identify the exact store or predict its value.
export function analyzeIndexedDrawWindows(rows){
 let pending=null,last=null,completeDraws=0,unpairedReturns=0;const changes=[],visitedStages={};
 for(const r of rows){
  if(r.phase==='ddraw-ebfe'){assert.equal(pending,null,'Missing indexed draw return');pending=r;last=r;}
  else if(pending&&(r.phase.startsWith('indexed-')||r.phase.startsWith('shader-'))&&r.scratch===pending.scratch){
   visitedStages[r.phase]=(visitedStages[r.phase]??0)+1;
   if(r.value!==last.value)changes.push({frame:r.frame,before:last.phase,after:r.phase,esp:r.esp,from:last.value,to:r.value});last=r;
  }else if(r.phase==='ddraw-ec3d'){
   if(!pending){unpairedReturns++;continue;}
   assert.equal(r.frame,pending.frame);assert.equal(r.esp,pending.esp);assert.equal(r.scratch,pending.scratch);
   if(r.value!==last.value)changes.push({frame:r.frame,before:last.phase,after:r.phase,esp:r.esp,from:last.value,to:r.value});
   completeDraws++;pending=null;last=null;
  }
 }
 return {completeDraws,unpairedReturns,pendingDraws:pending?1:0,changes,visitedStages};
}
