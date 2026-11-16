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
export function analyzeChaseFrame(rows,terrain){
 let state=null,pending=null,tail=null,frames=0,words=0,expectedPhase='source-entry',cameraAddress=null,identity=null,entry=null;
 const fixedFields=[10,11,61,72,74,78,88,91,93,98,99,100,101];
 for(const r of rows){
  if(!['source-entry','fov-entry','updated'].includes(r.phase))continue;
  assert.equal(r.phase,expectedPhase,'Missing chase frame boundary');
  assert.equal(r.frame,frames,'Nonsequential chase frame');
  if(r.phase==='source-entry'){
   assert.equal(r.inputs.length,102);const v=floats(r.inputs);
   if(!state){
    cameraAddress=r.camera;
    identity={pointers:r.pointers.slice(),fixed:fixedFields.map(i=>r.inputs[i])};
    state={controller:{settings:v.slice(50,54),eyeResetFlag:r.inputs[28],restoreFlag:r.inputs[73],previousMode:r.inputs[75],target:floats(r.result.slice(0,3)),camera:{zoom:v[49],pitch:v[23],radius:v[24],yaw:v[26],orbitAngle:v[27],backup:v.slice(33,36)},axis:v.slice(20,23),filters:Array.from({length:6},(_,i)=>floats(r.filters.slice(i*4,i*4+4)))},renderCamera:{values:Array.from(floats(r.cameraPose.slice(0,10))),upValid:r.cameraPose[10],forwardValid:r.cameraPose[11],refreshCounter:r.cameraPose[12],retainedMode:r.inputs[88],fov:v[90],refreshByte:r.inputs[92],skipUpdate:r.inputs[91],near:v[98],far:v[99],aspect:v[100],width:r.inputs[101]},nodes:[0,1].map(i=>({flag12c:r.nodeVisibility[i*9],fields240:floats(r.nodeVisibility.slice(i*9+1,i*9+9))})),fovFilter:v.slice(94,98),matrices:floats(r.matrices)};
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
   const name=Buffer.alloc(16);r.inputs.slice(79,83).forEach((x,i)=>name.writeUInt32LE(x,i*4));
   const input={initialized:r.inputs[74],source:{direction:v.slice(54,57),velocity:v.slice(36,39),bike6a4:v[40],bike620:r.inputs[57]},base:{position:v.slice(58,61),velocity:v.slice(36,39),usePrevious:r.inputs[61]},
    controls:{mode:r.inputs[11],active:r.inputs[62],keys:r.inputs[64],joystick:r.inputs[65],count:r.inputs[66]|0,pov:r.inputs[67],button2:r.inputs[68],button3:r.inputs[69],modifierA:r.inputs[70],modifierB:r.inputs[71],multiplierField:v[63],usePrevious:r.inputs[61],freeCamera:r.inputs[72]},
    heading:{mode:r.inputs[11],actorType:r.inputs[12],distance:v[10],bank:v[17],lean:v[18],speedBits:r.inputs[29],crashed:r.inputs[32],velocity:v.slice(36,39),denominator5ec:v[39],denominator6a4:v[40],bike6b0:v[42],bikeBfc:r.inputs[43],manager314:r.inputs[44],bike8b4:r.inputs[45],rider144:r.inputs[46],rider170:r.inputs[47],rider140:r.inputs[48]},
    clearance:{terrain,worldMode:r.inputs[76],worldEnabled:r.inputs[77],worldScale:v[78],sceneName:name.toString('ascii').split('\0')[0]},
    finalize:{active:r.inputs[62],bike4e8:v[86],bike4d8:v[87],ownerCounter:r.inputs[89]}};
   assert.deepEqual(r.inputs.slice(84,86),bits([terrain.heightScale,terrain.worldToGrid]));
   entry=r;
   pending=stepMcmChaseFrame(state,input,floats([r.deltaBits])[0],{tailControls:controller=>{tail=cameraFields(controller);}});
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
   words+=150;frames++;pending=null;tail=null;expectedPhase='source-entry';
  }
 }
 assert.ok(state&&!pending&&expectedPhase==='source-entry','Incomplete chase frames');
 return {frames,words,intermediateEvolutionInputs:0,tailControlAssertions:frames};
}
