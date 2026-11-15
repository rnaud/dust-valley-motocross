import assert from 'node:assert/strict';
import {analyzeLiveChaseController} from './analyze-live-chase-controller.mjs';
import {analyzeCameraSubmission} from './analyze-camera-submission.mjs';
import {applyMcmFogPlanes} from '../../src/physics/mcm/fog-planes.js';
import {restoreMcmSubmissionPlanes} from '../../src/physics/mcm/camera-submission.js';
const bits=a=>Array.from(new Uint32Array(Float32Array.from(a).buffer));
const float=b=>new Float32Array(Uint32Array.of(b).buffer)[0];
const identity=bits([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const oldPhases=new Set(['bike-entry','submit-entry','submit-view','submit-projection','submit-exit','product-before','product-after','product-store','scratch-store']);
const matrixWords=m=>bits([...m.projection,...m.view,...m.combined,...m.screen,m.screenScale]);
export function analyzeRenderGates(rows,terrain){
 // Independently preserve the existing computed-camera -> exact-store proof.
 const submission=analyzeCameraSubmission(rows.filter(r=>r.inputs||(r.frame>0&&oldPhases.has(r.phase))),terrain);
 const computed=new Map();analyzeLiveChaseController(rows.filter(r=>r.inputs),{terrain,matrices:true,onMatrices:r=>computed.set(r.frame,r)});
 let latest=-1,camera=null,matrices=null,fog=null,world=null,pendingWorld=null,worldKnown=false;
 let fogSubmissions=0,resets=0,worldSubmissions=0,worldSetters=0,restoredLoops=0,derivedProducts=0,warmupEvents=0,otherWorldSetters=0;
 for(const r of rows){
  if(r.inputs){
   if(r.phase==='source-entry'&&camera){assert.deepEqual(r.inputs.slice(98,100),bits([camera.near,camera.far]),'Fog planes not retained into next update');assert.deepEqual(r.matrices,matrixWords(matrices),'Fog matrices not retained into next update');restoredLoops++;}
   if(r.phase==='updated'){latest=r.frame;camera=structuredClone(computed.get(latest).state);matrices=null;}
   continue;
  }
  assert.equal(r.frame,latest+1,'Render event reordered');
  if(!camera){warmupEvents++;continue;}
  if(r.phase==='submit-entry'){const result=restoreMcmSubmissionPlanes(camera,matrices);matrices=result.matrices;}
  else if(['fog-entry','fog-render-entry','fog-reset-entry'].includes(r.phase)){
   assert.equal(fog,null,'Nested fog entry');assert.equal(r.camera,computed.get(latest).camera);assert.deepEqual(r.fields.slice(2,4),bits([camera.near,camera.far]),'Fog entry planes differ');
   const reset=r.phase==='fog-reset-entry';assert.ok(reset||r.fields[0],'Disabled fog path needs an exit boundary');
   const result=reset?restoreMcmSubmissionPlanes(camera,matrices):applyMcmFogPlanes(camera,{enabled:r.fields[0],far:float(r.fields[1])},matrices);matrices=result.matrices;fog={object:r.object,phase:reset?'fog-reset-submit':r.phase==='fog-entry'?'fog-submit':'fog-render-submit'};
  }else if(['fog-submit','fog-render-submit','fog-reset-submit'].includes(r.phase)){
   assert.ok(fog,'Missing fog entry');assert.equal(r.phase,fog.phase);assert.equal(r.object,fog.object);assert.deepEqual(r.fields.slice(2,4),bits([camera.near,camera.far]));assert.deepEqual(r.args.slice(0,2),[3,r.camera+0x30]);assert.deepEqual(r.words,bits(matrices.projection),'Computed fog projection differs');if(r.phase==='fog-reset-submit')resets++;else fogSubmissions++;fog=null;
  }else if(r.phase==='world-entry'){
   assert.equal(world,null,'Unfinished world entry');assert.equal(r.fields[0],0,'Suppressed draw needs an exit boundary');world=r;
  }else if(r.phase==='world-submit'){
   assert.ok(world,'Missing world entry');assert.equal(r.object,world.object);assert.deepEqual(r.fields,world.fields,'World gate state changed');assert.equal(r.args[0],1);assert.deepEqual(r.words,identity,'Original draw identity differs');pendingWorld=r.args[1];worldSubmissions++;world=null;
  }else if(r.phase==='wine-transform'&&r.args[2]===256){
   if(r.callers.includes(0x4458ee)){assert.ok(pendingWorld,'Missing original world submission');assert.equal(r.args[3],pendingWorld);assert.deepEqual(r.words,identity,'Wine world submission differs');pendingWorld=null;worldKnown=true;worldSetters++;}
   else {worldKnown=false;otherWorldSetters++;}
  }else if(r.phase==='product-before'){
   assert.ok(worldKnown,'Product world was not derived from original draw');assert.deepEqual(r.words.slice(16),identity);derivedProducts++;
  }
 }
 assert.ok(!fog&&!world&&!pendingWorld,'Incomplete draw sequence');assert.ok(restoredLoops&&derivedProducts&&resets&&worldSetters,'Missing draw evidence');
 return {submission,fogSubmissions,resets,worldSubmissions,worldSetters,restoredLoops,derivedProducts,otherWorldSetters,warmupEvents};
}
