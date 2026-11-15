import {finalizeMcmChaseCamera} from '../../src/physics/mcm/chase-finalize.js';
import {readMcmTerrain} from './terrain-data.mjs';
import {applyMcmChaseClearance} from '../../src/physics/mcm/chase-clearance.js';
import {finishMcmChaseSmoothing} from '../../src/physics/mcm/chase-post-smoothing.js';
import {stepMcmChaseController} from '../../src/physics/mcm/chase-controller.js';
import {prepareMcmChaseEntry} from '../../src/physics/mcm/chase-entry.js';
import {stepMcmChaseControls} from '../../src/physics/mcm/chase-controls.js';
import assert from 'node:assert/strict';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {deriveMcmChaseSource,deriveMcmChaseBase} from '../../src/physics/mcm/chase-spatial-inputs.js';
import {stepMcmHeadingChase} from '../../src/physics/mcm/chase-heading.js';
const floats=w=>new Float32Array(Uint32Array.from(w).buffer),bits=f=>Array.from(new Uint32Array(f.buffer));
const filterBits=state=>{const f=new Float32Array(24);state.filters.forEach((r,i)=>f.set(r,i*4));return bits(f);};
const renderCameraWords=c=>[...bits(Float32Array.from(c.values)),c.upValid,c.forwardValid,c.refreshCounter];
const renderNodeWords=nodes=>nodes.flatMap(n=>[n.flag12c,...bits(n.fields240)]);
const cameraWords=r=>[r.inputs[23],r.inputs[24],r.inputs[26],r.inputs[27],r.inputs[28],...r.inputs.slice(33,36),r.inputs[49],...r.inputs.slice(50,54)];
const cameraState=s=>{const c=s.camera;return [...bits(Float32Array.of(c.pitch,c.radius,c.yaw,c.orbitAngle)),s.eyeResetFlag,...bits(c.backup),...bits(Float32Array.of(c.zoom)),...bits(s.settings)];};
export function analyzeLiveChaseController(rows,{postSmoothing=false,terrain=null,finalize=false}={}){
 assert.ok(!finalize||terrain,'Finalization requires terrain');const clearance=!!terrain;if(clearance)postSmoothing=true;
 let renderCamera=null,renderNodes=null,finalizeBefore=null,clearanceResult=null;
 let joinedState=null,controlsInput=null,sourceInput=null,baseInput=null,smoothed=null,postBefore=null,postResult=null,clearanceBefore=null;
 let state=null,pending=null,identity=null,pairs=0,active=0,bypassed=0;const modes=new Set();let resets=0;
 const phases=['source-entry','source-exit','restore-entry','base-entry','base-exit','controls-entry','before','after',...(postSmoothing?['post']:[]),...(clearance?['clearance']:[]),...(finalize?['finalized']:[])];
 let eyeGate=0,motionGate=0,multiplier=0,restoreFlag=0;let phaseIndex=0,sourceEntry=null,baseEntry=null,source=null,base=null,retainedTarget=null,retainedTargetChecks=0;
 for(const r of rows){
  for(const [name,n] of [['inputs',finalize?90:clearance?86:postSmoothing?76:75],['filters',24],['pointers',6],['targets',6],['result',6],...(clearance?[['groundPoint',3]]:[]),...(finalize?[['cameraPose',13],['nodeVisibility',18]]:[])])assert.ok(Array.isArray(r[name])&&r[name].length===n&&r[name].every(v=>Number.isInteger(v)&&v>=0&&v<=0xffffffff),'Invalid '+name);
  assert.ok(Number.isInteger(r.deltaBits)&&r.deltaBits>=0&&r.deltaBits<=0xffffffff,'Invalid delta');
  assert.equal(r.phase,phases[phaseIndex],'Missing or reordered spatial stage');phaseIndex=(phaseIndex+1)%phases.length;
  assert.equal(r.frame,pairs,'Nonsequential spatial frame');
  if(r.phase==='source-entry'){
   if(!state){
    assert.ok(r.pointers.every(p=>p!==0),'Live initialization not captured');
    const initial=floats(r.inputs);
    state={settings:initial.slice(50,54),eyeResetFlag:r.inputs[28],camera:{zoom:initial[49],pitch:initial[23],radius:initial[24],yaw:initial[26],orbitAngle:initial[27],backup:initial.slice(33,36)},axis:floats(r.inputs.slice(20,23)),filters:Array.from({length:6},(_,i)=>floats(r.filters.slice(i*4,i*4+4)))};
    identity={camera:r.camera,pointers:r.pointers};
   }
   assert.ok(r.inputs[74],'Unrecovered camera initialization');
   assert.deepEqual(cameraWords(r),cameraState(state),'Retained camera differs at source entry');
   if(pairs===0){restoreFlag=r.inputs[73];retainedTarget=floats(r.result.slice(0,3));joinedState={...structuredClone(state),restoreFlag,target:Float32Array.from(retainedTarget)};if(postSmoothing)state.previousMode=joinedState.previousMode=r.inputs[75];}
   assert.equal(r.inputs[73],restoreFlag,'Retained restore flag differs');if(postSmoothing)assert.equal(r.inputs[75],state.previousMode,'Retained previous mode differs');
   if(finalize){
    if(!renderCamera){renderCamera={values:Array.from(floats(r.cameraPose.slice(0,10))),upValid:r.cameraPose[10],forwardValid:r.cameraPose[11],refreshCounter:r.cameraPose[12],retainedMode:r.inputs[88]};renderNodes=[0,1].map(i=>({flag12c:r.nodeVisibility[i*9],fields240:floats(r.nodeVisibility.slice(i*9+1,i*9+9))}));}
    // 0x479e40 later decrements +0x1bc; its full update is outside this boundary.
    // Retain pose/flags; explicitly treat the counter alone as a boundary input.
    assert.deepEqual(r.cameraPose.slice(0,12),renderCameraWords(renderCamera).slice(0,12),'Retained render camera differs');
    renderCamera.refreshCounter=r.cameraPose[12];
    assert.deepEqual(r.nodeVisibility,renderNodeWords(renderNodes),'Retained render nodes differ');
   }
   sourceEntry=r;const v=floats(r.inputs);
   sourceInput={direction:v.slice(54,57),velocity:v.slice(36,39),bike6a4:v[40],bike620:r.inputs[57]};source=deriveMcmChaseSource(sourceInput).source;
  }else{
   for(const name of ['camera','ebp','deltaBits'])assert.equal(r[name],sourceEntry[name],'Spatial frame identity changed');
  }
  if(r.phase==='restore-entry'){
   assert.deepEqual(cameraWords(r),cameraState(state),'Camera changed before restore');
   ({restoreFlag,eyeGate}=prepareMcmChaseEntry(state.camera,{mode:r.inputs[11],restoreFlag,crashed:r.inputs[32]}));
  }
  if(r.phase==='base-entry'){
   assert.deepEqual(cameraWords(r),cameraState(state),'Native restored camera differs');assert.equal(r.inputs[73],restoreFlag);assert.equal(r.inputs[30],eyeGate,'Native eye gate differs');
  }
  if(r.phase==='controls-entry'){
   assert.deepEqual(cameraWords(r),cameraState(state),'Camera changed before controls');
   const v=floats(r.inputs);state.camera.reset=state.eyeResetFlag;
   controlsInput={mode:r.inputs[11],active:r.inputs[62],delta:floats([r.deltaBits])[0],keys:r.inputs[64],joystick:r.inputs[65],count:r.inputs[66]|0,pov:r.inputs[67],button2:r.inputs[68],button3:r.inputs[69],modifierA:r.inputs[70],modifierB:r.inputs[71],multiplierField:v[63],usePrevious:r.inputs[61],freeCamera:r.inputs[72]};
   const result=stepMcmChaseControls(state.camera,controlsInput);
   state.eyeResetFlag=state.camera.reset;motionGate=result.motionGate;multiplier=result.multiplier;
  }
  if(r.phase==='source-exit'){
   assert.equal(r.esp,sourceEntry.esp,'Source stack changed');assert.deepEqual(r.inputs.slice(13,16),bits(source),'Native source differs');
  }else if(r.phase==='base-entry'){
   baseEntry=r;const v=floats(r.inputs);
   if(retainedTarget){assert.deepEqual(r.result.slice(0,3),bits(retainedTarget),'Retained target differs at base entry');retainedTargetChecks++;}
   else retainedTarget=floats(r.result.slice(0,3));
   baseInput={position:v.slice(58,61),velocity:v.slice(36,39),delta:floats([r.deltaBits])[0],usePrevious:r.inputs[61]};base=deriveMcmChaseBase({...baseInput,previousTarget:retainedTarget}).base;
  }else if(r.phase==='base-exit'){
   assert.equal(r.esp,baseEntry.esp,'Base stack changed');assert.deepEqual(r.inputs.slice(0,3),bits(base),'Native base differs');
  }
  if(r.phase==='before'){
   assert.equal(r.inputs[30],eyeGate);assert.equal(r.inputs[31],motionGate);assert.deepEqual(r.inputs.slice(41,42),bits(Float32Array.of(multiplier)),'Native multiplier differs');
   assert.deepEqual(r.inputs.slice(13,16),bits(source),'Source differs before heading');assert.deepEqual(r.inputs.slice(0,3),bits(base),'Base differs before heading');
   assert.equal(pending,null,'Unpaired entry');assert.equal(r.frame,pairs,'Nonsequential frame');
   assert.deepEqual({camera:r.camera,pointers:r.pointers},identity,'Camera identity changed');
   assert.deepEqual(r.filters,filterBits(state),'Retained filters differ');
   assert.deepEqual(cameraWords(r),cameraState(state),'Retained camera state differs');
   assert.deepEqual(r.inputs.slice(20,23),bits(state.axis),'Retained shared axis differs');
   const v=floats(r.inputs),args={base:Float32Array.from(base),offset:v.slice(3,6),eye:v.slice(6,9),factor:v[9],distance:v[10],mode:r.inputs[11],actorType:r.inputs[12],source:Float32Array.from(source),angle:v[16],bank:v[17],lean:v[18],enabled:r.inputs[19],previousTarget:floats(r.targets.slice(0,3)),heading:v[25],speedBits:r.inputs[29],eyeGate,motionGate,crashed:r.inputs[32],velocity:v.slice(36,39),denominator5ec:v[39],denominator6a4:v[40],multiplier,bike6b0:v[42],bikeBfc:r.inputs[43],manager314:r.inputs[44],bike8b4:r.inputs[45],rider144:r.inputs[46],rider170:r.inputs[47],rider140:r.inputs[48]};
   const result=stepMcmHeadingChase(state,args,floats([r.deltaBits])[0]),values=new Float32Array(6);values.set(result.target);values.set(result.eye,3);
   const joined=stepMcmChaseController(joinedState,{initialized:sourceEntry.inputs[74],source:sourceInput,base:baseInput,controls:controlsInput,heading:args},floats([r.deltaBits])[0]);
   assert.deepEqual(bits(joined.target),bits(result.target),'Joined controller target differs');assert.deepEqual(bits(joined.eye),bits(result.eye),'Joined controller eye differs');
   assert.deepEqual(filterBits(joinedState),filterBits(state),'Joined controller filters differ');assert.deepEqual(cameraState(joinedState),cameraState(state),'Joined controller camera differs');assert.equal(joinedState.restoreFlag,restoreFlag);
   assert.equal(joined.eyeGate,eyeGate,'Joined controller entry ordering differs');
   smoothed=result;retainedTarget=Float32Array.from(result.target);if(result.reset)resets++;modes.add(args.mode);if(result.rotation.active)active++;else bypassed++;
   pending={row:r,targets:bits(result.targets),result:bits(values)};
  }else if(r.phase==='after'){
   assert.ok(pending,'Missing entry');
   for(const name of ['frame','camera','esp','ebp','deltaBits'])assert.equal(r[name],pending.row[name],'Boundary changed');
   assert.deepEqual(r.pointers,identity.pointers,'Filter identity changed');
   assert.deepEqual(r.inputs.slice(20,23),bits(state.axis),'Native shared axis differs');
   assert.deepEqual(r.targets,pending.targets,'Native targets differ');
   assert.deepEqual(r.filters,filterBits(state),'Native filters differ');
   assert.deepEqual(r.result,pending.result,'Native result differs');assert.deepEqual(cameraWords(r),cameraState(state),'Native camera state differs');if(postSmoothing){assert.equal(r.inputs[75],state.previousMode,'Previous mode changed before post-smoothing');postBefore=r;}else pairs++;pending=null;
  }else if(r.phase==='post'){
   assert.equal(r.esp,postBefore.esp,'Post-smoothing stack changed');
   for(const index of [11,12,61])assert.equal(r.inputs[index],postBefore.inputs[index],'Post-smoothing input changed');
   const input={mode:postBefore.inputs[11],actorType:postBefore.inputs[12],usePrevious:postBefore.inputs[61]};
   const result=finishMcmChaseSmoothing(state,smoothed,input);finishMcmChaseSmoothing(joinedState,smoothed,input);
   assert.deepEqual(r.result,[...bits(result.target),...bits(result.eye)],'Native post-smoothing output differs');
   assert.deepEqual(r.filters,filterBits(state),'Native post-smoothing filters differ');
   assert.deepEqual(cameraWords(r),cameraState(state),'Native post-smoothing camera differs');
   assert.equal(r.inputs[75],state.previousMode,'Native post-smoothing mode differs');
   postResult=result;retainedTarget=Float32Array.from(result.target);if(clearance)clearanceBefore=r;else pairs++;
  }else if(r.phase==='clearance'){
   assert.equal(r.esp,clearanceBefore.esp,'Clearance stack changed');
   for(let i=76;i<86;i++)assert.equal(r.inputs[i],clearanceBefore.inputs[i],'Clearance context changed');
   assert.deepEqual(r.inputs.slice(84,86),bits(Float32Array.of(terrain.heightScale,terrain.worldToGrid)),'Terrain scales differ');
   assert.ok(r.inputs[83],'Missing original terrain root');
   const nameBytes=Buffer.alloc(16);clearanceBefore.inputs.slice(79,83).forEach((v,i)=>nameBytes.writeUInt32LE(v,i*4));
   const args={terrain,eye:postResult.eye,worldMode:clearanceBefore.inputs[76],worldEnabled:clearanceBefore.inputs[77],worldScale:floats([clearanceBefore.inputs[78]])[0],sceneName:nameBytes.toString('ascii').split('\0')[0]};
   const result=applyMcmChaseClearance(state.camera,args);applyMcmChaseClearance(joinedState.camera,args);
   assert.deepEqual(r.result,[...bits(retainedTarget),...bits(result.eye)],'Native clearance output differs');
   assert.deepEqual(r.groundPoint,bits(Float32Array.of(result.eye[0],result.ground,result.eye[2])),'Native clearance ground query differs');
   assert.equal(r.inputs[30],result.special,'Native clearance world gate differs');
   assert.deepEqual(cameraWords(r),cameraState(state),'Native clearance camera differs');
   assert.deepEqual(r.filters,filterBits(state),'Clearance changed filters');
   clearanceResult=result;finalizeBefore=r;if(!finalize)pairs++;
  }else if(r.phase==='finalized'){
   assert.equal(r.esp,finalizeBefore.esp,'Finalization stack changed');
   for(const i of [11,19,62,86,87,88,89])assert.equal(r.inputs[i],finalizeBefore.inputs[i],'Finalization input changed');
   assert.deepEqual(finalizeBefore.cameraPose,renderCameraWords(renderCamera),'Camera changed before finalization');
   assert.deepEqual(finalizeBefore.nodeVisibility,renderNodeWords(renderNodes),'Nodes changed before finalization');
   const v=floats(finalizeBefore.inputs);renderCamera.retainedMode=finalizeBefore.inputs[88];
   finalizeMcmChaseCamera(renderCamera,renderNodes,{active:finalizeBefore.inputs[62],mode:finalizeBefore.inputs[11],enabled:finalizeBefore.inputs[19],bike4e8:v[86],bike4d8:v[87],eye:clearanceResult.eye,target:retainedTarget,ownerCounter:finalizeBefore.inputs[89]});
   assert.deepEqual(r.cameraPose,renderCameraWords(renderCamera),'Native finalized camera differs');
   assert.deepEqual(r.nodeVisibility,renderNodeWords(renderNodes),'Native finalized nodes differ');
   pairs++;
  }
 }
 assert.ok(state&&!pending&&phaseIndex===0,'Incomplete capture');return {pairs,downstreamWords:pairs*52,spatialWords:pairs*12,retainedTargetChecks,active,bypassed,resets,modes:[...modes].sort(),...(postSmoothing?{postWords:pairs*32}:{}),...(clearance?{clearanceWords:pairs*8}:{}),...(finalize?{finalizeWords:pairs*31,refreshCounterBoundaryInputs:pairs}:{})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const terrainIndex=process.argv.indexOf('--terrain'),terrain=terrainIndex<0?null:readMcmTerrain(fs.readFileSync(process.argv[terrainIndex+1]));
 console.log(JSON.stringify(analyzeLiveChaseController(fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse),{postSmoothing:process.argv.includes('--post'),terrain,finalize:process.argv.includes('--finalize')}),null,2));
}
