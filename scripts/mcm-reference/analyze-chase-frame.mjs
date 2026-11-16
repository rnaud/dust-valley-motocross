import {createMcmChaseState,createMcmChaseInput} from '../../src/physics/mcm/chase-state.js';
import assert from 'node:assert/strict';
import {stepMcmChaseFrame} from '../../src/physics/mcm/chase-frame.js';
const floats=w=>new Float32Array(Uint32Array.from(w).buffer);
const bits=v=>Array.from(new Uint32Array(Float32Array.from(v).buffer));
const cameraFields=s=>[...bits([s.camera.pitch,s.camera.radius,s.camera.yaw,s.camera.orbitAngle]),s.eyeResetFlag,...bits(s.camera.backup),...bits([s.camera.zoom]),...bits(s.settings)];
const observedFields=r=>[r.inputs[23],r.inputs[24],r.inputs[26],r.inputs[27],r.inputs[28],...r.inputs.slice(33,36),r.inputs[49],...r.inputs.slice(50,54)];
const pose=c=>[...bits(c.values),c.upValid,c.forwardValid,c.refreshCounter];
const visibility=nodes=>nodes.flatMap(n=>[n.flag12c,...bits(n.fields240)]);
const filterWords=c=>c.filters.flatMap(f=>bits(f));
// Entry-only numerical evolution. The intermediate FOV-entry row is an
// assertion that uncaptured mode/FOV buttons caused no changes; never an input.
export function createChaseFrameComparison(terrain,{initial=null,projectEntry=null,initialState=null,advance=stepMcmChaseFrame}={}){
 let state=null,pending=null,tail=null,frames=initial?1:0,words=0,expectedPhase='source-entry',cameraAddress=null,identity=null,entry=null;
 const fixedFields=[10,11,61,72,74,78,88,91,93,98,99,100,101];
 const observe=observed=>{
  if(!['source-entry','fov-entry','updated'].includes(observed.phase))return;
  let r=observed;
  if(projectEntry&&r.phase==='source-entry')r=projectEntry(r);
  assert.equal(r.phase,expectedPhase,'Missing chase frame boundary');
  assert.equal(r.frame,frames,'Nonsequential chase frame');
  if(r.phase==='source-entry'){
   assert.equal(r.inputs.length,102);const v=floats(r.inputs);
   if(!state){
    const r=initial??observed,v=floats(r.inputs);
    cameraAddress=r.camera;
    identity={pointers:r.pointers.slice(),fixed:fixedFields.map(i=>r.inputs[i]),alternate:r.alternate&&['width','screenHeight','boundWidth','boundHeight'].map(k=>r.alternate[k])};
    state=initialState??createMcmChaseState(r);
   }
   assert.equal(r.camera,cameraAddress,'Camera identity changed');
   assert.deepEqual(r.pointers,identity.pointers,'Camera filter identity changed');
   assert.deepEqual(fixedFields.map(i=>r.inputs[i]),identity.fixed,'Unrecovered retained camera context changed');
   assert.deepEqual(observedFields(r),cameraFields(state.controller),'Entry retained camera differs');
   assert.deepEqual(r.filters,filterWords(state.controller),'Entry retained filters differ');
   assert.deepEqual(r.result.slice(0,3),bits(state.controller.target),'Entry retained target differs');
   assert.deepEqual(r.inputs.slice(20,23),bits(state.controller.axis),'Entry retained axis differs');
   assert.equal(r.inputs[73],state.controller.restoreFlag);assert.equal(r.inputs[75],state.controller.previousMode);
   assert.deepEqual(r.cameraPose,pose(state.renderCamera),'Entry retained pose differs');
   assert.deepEqual(r.nodeVisibility,visibility(state.nodes),'Entry retained visibility differs');
   assert.deepEqual(r.matrices,bits(state.matrices),'Entry retained matrices differ');
   assert.deepEqual(r.inputs.slice(94,98),bits(state.fovFilter),'Entry retained FOV filter differs');
   assert.equal(r.inputs[90],bits([state.renderCamera.fov])[0]);assert.equal(r.inputs[92],state.renderCamera.refreshByte);
   assert.deepEqual(r.inputs.slice(98,102),[...bits([state.renderCamera.near,state.renderCamera.far,state.renderCamera.aspect]),state.renderCamera.width],'Projection context changed');
   assert.equal(r.inputs[88],state.renderCamera.retainedMode);assert.equal(r.inputs[91],state.renderCamera.skipUpdate);
   assert.ok(r.inputs[62],'Inactive path has no FOV/update assertions in this format');
   const input=createMcmChaseInput(r,terrain,state);
   assert.deepEqual(r.inputs.slice(84,86),bits([terrain.heightScale,terrain.worldToGrid]));
   if(r.alternate){
    assert.deepEqual(['width','screenHeight','boundWidth','boundHeight'].map(k=>r.alternate[k]),identity.alternate,'Crash-camera projection context changed');
    assert.equal(bits([state.controller.camera.height])[0],bits([r.alternate.height])[0],'Entry crash-camera height differs');
   }
   entry=r;
   pending=advance(state,input,floats([r.deltaBits])[0],{tailControls:controller=>{tail=cameraFields(controller);}});
   expectedPhase='fov-entry';
  }else if(r.phase==='fov-entry'){
   assert.equal(r.camera,cameraAddress);assert.equal(r.deltaBits,entry.deltaBits,'Frame delta changed');
   assert.deepEqual(fixedFields.map(i=>r.inputs[i]),identity.fixed,'Unrecovered tail controls changed context');
   assert.deepEqual(observedFields(r),tail,'Unrecovered tail controls changed camera');
   expectedPhase='updated';
  }else{
   assert.equal(r.camera,cameraAddress);
   assert.equal(r.deltaBits,entry.deltaBits,'Frame delta changed');
   assert.deepEqual(r.pointers,identity.pointers,'Camera filter identity changed');
   assert.deepEqual(fixedFields.map(i=>r.inputs[i]),identity.fixed,'Unrecovered retained camera context changed');
   assert.deepEqual(observedFields(r),cameraFields(state.controller),'Frame camera differs');
   assert.deepEqual(r.filters,filterWords(state.controller),'Frame filters differ');
   assert.deepEqual(r.inputs.slice(20,23),bits(state.controller.axis),'Frame shared axis differs');
   assert.deepEqual(r.result,[...bits(state.controller.target),...bits(pending.clearance.eye)],'Frame spatial output differs');
   assert.equal(r.inputs[73],state.controller.restoreFlag);assert.equal(r.inputs[75],state.controller.previousMode);
   assert.deepEqual(r.cameraPose,pose(state.renderCamera),'Frame pose differs');
   assert.deepEqual(r.nodeVisibility,visibility(state.nodes),'Frame visibility differs');
   assert.deepEqual(r.inputs.slice(94,98),bits(state.fovFilter),'Frame FOV filter differs');
   assert.equal(r.inputs[90],bits([state.renderCamera.fov])[0]);assert.equal(r.inputs[92],state.renderCamera.refreshByte);
   assert.deepEqual(r.matrices,bits(state.matrices),'Frame matrices differ');
   if(r.alternate)assert.equal(bits([state.controller.camera.height])[0],bits([r.alternate.height])[0],'Frame crash-camera height differs');
   words+=150;frames++;pending=null;tail=null;expectedPhase='source-entry';
  }
 };
 return {observe,get state(){return state;},finish(){
  assert.ok(state&&!pending&&expectedPhase==='source-entry','Incomplete chase frames');
  const count=frames-(initial?1:0);
  return {frames:count,words,intermediateEvolutionInputs:0,tailControlAssertions:count};
 }};
}
export function analyzeChaseFrame(rows,terrain){
 const comparison=createChaseFrameComparison(terrain);for(const row of rows)comparison.observe(row);return comparison.finish();
}
